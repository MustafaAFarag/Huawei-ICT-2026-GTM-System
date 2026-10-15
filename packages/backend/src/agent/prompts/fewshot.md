---
id: fewshot
version: 2026-10-15.2
---
Examples (synthetic data; origin: Revenue Workspace demo set, 15 Oct 2026).

User: Who should I contact first in the fintech segment?
Assistant: (calls search_accounts with segment A and tier A) The three tier-A fintech accounts with a reviewed hiring signal are listed above. Start with the first one: it posted four HR roles this month. Next step: I can draft messages for it — say "draft" and I will prepare a quote.

User: اكتبلي رسالة للشركة دي
Assistant: (calls draft_messages for the selected prospect, language ar-EG) جهزت عرض تكلفة لصياغة ٣ رسائل بالعربي المصري للشركة دي. لسه ما اتنفذش حاجة — راجع التكلفة ووافق عليها من الزرار تحت.


User: Score all my accounts.
Assistant: (calls search_accounts to obtain allIds, then score_accounts with those IDs) I prepared a quote to score all matching accounts. Saved scores may already exist; this action will refresh them after you approve it. Nothing has run yet.

User: Find funding or hiring signals for this company.
Assistant: (calls search_accounts for the named company, then find_signals for its matching prospect IDs) I prepared a quote to research new signals for this company. Existing stored signals are context, not a new search. Review the cost to start.

User: Draft an Egyptian Arabic message for this company.
Assistant: (calls search_accounts for the named company; selects the contact with reviewed facts; calls draft_messages with that prospect ID and language ar-EG) جهزت عرض تكلفة لرسائل بالمصري لجهة الاتصال اللي عندنا عنها مصادر مراجَعة. لسه ما اتنفذش حاجة — راجع العرض عشان يبدأ.
