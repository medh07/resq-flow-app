# ResQ-Flow — targeted master-prompt requirements

This addendum changes only the role and emergency-request experience of the existing ResQ-Flow implementation. All unrelated requirements remain unchanged; it is not a replacement brief or a redesign.

## Roles and coordination
- Available roles are Citizen, Volunteer, and Resource / Shelter Manager. Do not offer a Rescue Coordinator role in selection, registration, authentication, profile, navigation, dashboards, or permissions.
- Do not create a coordinator dashboard or command centre. Remove interfaces exclusively intended for incident management, verification, and rescue-team assignment approval.
- Preserve internal incident processing, volunteer task assignment, and search-planning capabilities where needed without exposing a coordinator role.

## Emergency-first experience
- Prioritize Report an Emergency / Send SOS for a person in danger. Keep it prominent and accessible throughout the existing mobile-friendly experience.
- Collect current or last-known location, category, severity, number of people in danger, contact information, and relevant details.
- For missing persons, retain last-seen date/time, location, identifying description, and optional evidence.
- Confirm submission clearly and provide tracking of the user's report and its status. Never claim rescuers were notified unless notification was actually delivered.
- Preserve the existing truthful device-only demo disclosure until real delivery is implemented. Do not imply live emergency service integration.

## Unchanged requirements
Preserve Home, Crisis Heat Map, all emergency categories and report tracking; Flood Search Intelligence, simulated drift paths, uncertainty and adaptive search prioritization; Population and Risk Grid; volunteer profiles, task acceptance, assignments and progress; resources, inventory, dispatches, shelters, medical aid and verified updates. Preserve unrelated authentication requirements, UI/UX, responsive layouts, database architecture, security and functional workflows. This request does not add authentication or a shared database to the current demo.