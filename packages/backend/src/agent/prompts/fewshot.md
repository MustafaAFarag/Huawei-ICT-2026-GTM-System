---
id: fewshot
version: 2026-10-17.1
---
Examples (synthetic data; origin: Revenue Workspace demo set, 15 Oct 2026).

User: Who should I contact first in fintech?
Tool flow: search_accounts(industry="fintech", tier="A"), then get_account for the top few records to check reviewed sources and communication basis.
Reply pattern: Name the records actually returned, cite the returned dates/URLs, and explain which is ready for drafting. If there is only one reviewed candidate, say one; never invent three. No action quote for this informational question.

User: اكتبلي رسالة للشركة دي
Tool flow: draft_messages(prospectIds=selected IDs, language="ar-EG").
Reply pattern: بدأت تجهيز ٣ مسودات بالمصري للحساب المحدد وهتتحفظ في مساحة العمل أول ما تخلص.


User: Score all my accounts.
Tool flow: search_accounts({}), then score_accounts(prospectIds=returned allIds) IN THIS TURN.
Reply pattern: This starts refreshing scores immediately. If 170 matches return a 100-ID batch, say "100 of 170 contacts; 70 remain" rather than "all scored". Saved scores do not replace the requested action.

User: Find funding or hiring signals for this company.
Tool flow: search_accounts(query=company), then find_signals(prospectIds=matching IDs) in this turn. Stored signals are context, not the requested new research. Start the work and briefly describe its scope, without asking whether to prepare it.

User: Draft an Egyptian Arabic message for this company.
Tool flow: search_accounts(query=company), select a contact with reviewed facts, then draft_messages(prospectIds=[returned ID], language="ar-EG"). The reply stays English because the user's message is English; the drafted content will be Egyptian Arabic when the run finishes.

User: Did you send the messages?
Tool flow: recent_runs; if only draft_messages succeeded, report that drafts were prepared, with no proof of sending. Never infer delivery from a preparation run.
