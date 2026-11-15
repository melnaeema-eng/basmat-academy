# Weekly CCNA labs

Repository: melnaeema-eng/basmat-academy, branch main.
Target: https://academy.basmat-alnawabig.com.sa/ccna-labs

Read public/ccna-labs/index.json and prior lab materials before selecting the next topic. Preserve every previous lab. Add a complete, standalone, printable, responsive student HTML document at public/ccna-labs/<unique-lowercase-slug>/student.html. All assets must be local. Avoid third-party scripts and raw untrusted HTML. Include learning objectives, prerequisites, duration, topology, equipment, address tables, full per-device IOS commands, execution and verification with expected results, success criteria, and fault exercises. Do not claim a Packet Tracer file exists unless actually created.

Append an entry to index.json with id, unique number, ISO date, title_ar, title_en, summary_ar, summary_en, duration_minutes, status="published", student_url="/ccna-labs/<slug>/student.html", topic, objectives, next_topic. Read this index as the cumulative published-lab register. Only mark published when the student document is complete. No placeholders.

This GitHub repository is PUBLIC. Never commit instructor solutions, answer keys, credentials, or private data, including in source, JSON, HTML, or Git history. Save the instructor guide separately as a private deliverable. Instructor website delivery requires an existing server-enforced private storage path; a hidden link or client-side role check is insufficient.

Run npm ci and npm run build, inspect output, then commit and push only intended changes. Use the site's existing hosting integration; no hosting workflow is configured in this repository. A successful GitHub push is not proof of production deployment. Confirm the actual production student page and index contents; report a deployment blocker when not verifiable. Do not create another site or change DNS.

Historical context: basic PC–Switch–PC lab was previously prepared; IP addressing, CIDR and route aggregation were explained previously. Do not equate explained topics with completed labs. The initial empty index does not erase historical training; state assumptions if historical lab details cannot be recovered.
