import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { ReportPage } from '@/routes/report';
import { backendCategory, submissionKey, uploadPhoto, photoExtension } from '@/lib/resq/reports';
const mock = vi.hoisted(() => ({ rpc: vi.fn(), upload: vi.fn() }));
vi.mock('@/lib/resq/client', () => ({ resqClient: () => ({ rpc: mock.rpc, storage: { from: () => ({ upload: mock.upload }) } }) }));
vi.mock('@/components/resq/Auth', () => ({ useCitizenAuth: () => ({ session: { user: { id: 'citizen-1' } } }), RequireCitizen: ({ children }: any) => children }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: any) => options, Link: ({ children }: any) => <a>{children}</a> }));
vi.mock('@/components/MapView', () => ({ MapView: ({ onPick }: any) => <button onClick={() => onPick(26.1, 91.7)}>Select location</button> }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); sessionStorage.clear(); mock.rpc.mockReset(); mock.upload.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function fill() {
  fireEvent.click(screen.getByRole('button', { name: 'Water & sanitation' }));
  fireEvent.change(screen.getByPlaceholderText('Describe the situation…'), { target: { value: 'TEST ONLY: water supply request.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Select location' }));
  fireEvent.change(screen.getByPlaceholderText('Landmark / area name'), { target: { value: 'Test area' } });
}
describe('connected SOS', () => {
  it('maps categories to backend values and keeps retry ID account/payload specific', async () => {
    expect(backendCategory('water')).toBe('water_sanitation');
    expect(backendCategory('missing')).toBe('missing_person');
    const first = await submissionKey('a', { details: 'private report' });
    expect((await submissionKey('a', { details: 'private report' })).id).toBe(first.id);
    expect((await submissionKey('b', { details: 'private report' })).id).not.toBe(first.id);
    expect((await submissionKey('a', { details: 'changed' })).id).not.toBe(first.id);
    expect(JSON.stringify(sessionStorage)).not.toContain('private report');
  });
  it('shows server receipt only after successful submission', async () => {
    mock.rpc.mockResolvedValue({ data: 'request-1', error: null });
    render(<ReportPage />); fill(); fireEvent.click(screen.getByRole('button', { name: 'Send SOS / Submit emergency report' }));
    await screen.findByText('SOS saved to ResQ-Flow');
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(mock.rpc).toHaveBeenCalledWith('resq_flow_submit_request', expect.objectContaining({ p_categories: ['water_sanitation'], p_latitude: 26.1, p_longitude: 91.7, p_people: 1 }));
  });
  it('retains the same submission ID on a failed request retry', async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: new Error('Network failed') }).mockResolvedValueOnce({ data: 'request-1', error: null });
    render(<ReportPage />); fill(); fireEvent.click(screen.getByRole('button', { name: 'Send SOS / Submit emergency report' }));
    await screen.findByRole('alert');
    expect(screen.queryByText('SOS saved to ResQ-Flow')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Send SOS / Submit emergency report' }));
    await screen.findByText('SOS saved to ResQ-Flow');
    expect(mock.rpc.mock.calls[0][1].p_submission_id).toBe(mock.rpc.mock.calls[1][1].p_submission_id);
  });
  it('maps missing-person fields and omits anonymous contact details', async () => {
    mock.rpc.mockResolvedValue({ data: 'request-2', error: null });
    render(<ReportPage />); fill();
    fireEvent.click(screen.getByRole('button', { name: 'Missing person' }));
    fireEvent.change(screen.getByPlaceholderText('Name or short description'), { target: { value: 'TEST person' } });
    fireEvent.change(screen.getByLabelText('Last seen date and time'), { target: { value: '2026-01-01T10:00' } });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Send SOS / Submit emergency report' }));
    await screen.findByText('SOS saved to ResQ-Flow');
    expect(mock.rpc).toHaveBeenCalledWith('resq_flow_submit_request', expect.objectContaining({ p_categories: ['missing_person'], p_anonymous: true, p_name: null, p_phone: null, p_missing: expect.objectContaining({ description: 'TEST person', latitude: 26.1 }) }));
  });
  it('keeps the SOS receipt when its photo fails, without resubmitting the SOS', async () => {
    mock.rpc.mockImplementation((name: string) => Promise.resolve({ data: name === 'resq_flow_submit_request' ? 'request-3' : 'request-3/photo.png', error: null }));
    mock.upload.mockResolvedValue({ error: new Error('Offline') });
    const { container } = render(<ReportPage />); fill();
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['photo'], 'photo.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Send SOS / Submit emergency report' }));
    await screen.findByRole('button', { name: 'Retry photo upload' });
    expect(screen.getByText('SOS saved to ResQ-Flow')).toBeInTheDocument();
    mock.upload.mockResolvedValue({ error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Retry photo upload' }));
    await screen.findByText('View my report');
    expect(mock.rpc.mock.calls.filter(call => call[0] === 'resq_flow_submit_request')).toHaveLength(1);
  });
  it('rejects zero people without submitting', async () => {
    render(<ReportPage />); fill();
    fireEvent.change(screen.getByLabelText('People affected'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send SOS / Submit emergency report' }));
    await screen.findByText('Enter a realistic number'); expect(mock.rpc).not.toHaveBeenCalled();
  });
  it('reserves private photo path before upload, and exposes upload errors', async () => {
    mock.rpc.mockResolvedValue({ data: 'request-1/photo.png', error: null });
    mock.upload.mockResolvedValue({ error: new Error('Upload failed') });
    await expect(uploadPhoto('request-1', new File(['photo'], 'photo.png', { type: 'image/png' }))).rejects.toThrow('Upload failed');
    expect(mock.upload).toHaveBeenCalledWith('request-1/photo.png', expect.any(File), expect.objectContaining({ upsert: false }));
    expect(() => photoExtension(new File(['x'], 'x.svg', { type: 'image/svg+xml' }))).toThrow();
  });
});
