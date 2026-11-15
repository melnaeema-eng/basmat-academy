# Academy lab deployment order

Apply COMMERCE, PDF, PREVIEW, PROGRESS, REFUND-25-PERCENT, then AUTO-PROGRESS. Do not reapply PROGRESS after AUTO-PROGRESS: the later migration revokes the manual stage API.

Student PDF originals are inaccessible to anonymous/authenticated roles; only protected rendered pages are selected. Lab progress uses server-timed viewing sessions, with no client-supplied percentage. Automatic viewing progress is not a practical assessment or certificate. Refund requests are blocked permanently after 25% consumption, including approval of previously pending requests.

Outstanding: native simulator projects and electronically graded course quizzes.
