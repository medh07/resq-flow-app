<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep role normalization in `src/lib/roles.ts` and normalize persisted profiles without resetting their data, so retired roles cannot reappear after reload.
- Keep incident processing and team-assignment actions in the existing store without exposing incident-management or assignment-approval controls; volunteer search planning and outcomes remain available separately.
- `master-prompt.md` records targeted requirements as an addendum to the existing implementation, because no original master-prompt document is present in this project.
