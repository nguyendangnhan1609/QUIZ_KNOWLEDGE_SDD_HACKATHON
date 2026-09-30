-- Insert sample document for smoke testing
INSERT INTO "public"."documents" (
    "filename",
    "mimeType",
    "storagePath",
    "textContent",
    "charCount",
    "createdAt"
) VALUES (
    'employee-handbook.txt',
    'text/plain',
    'docs/handbook-seed.txt',
    'Employee Handbook

Welcome to our company. This handbook outlines our policies and expectations.

Code of Conduct
All employees must follow our code of conduct at all times. This includes:
- Treating colleagues with respect and professionalism
- Maintaining confidentiality of company information
- Avoiding conflicts of interest
- Reporting any violations to HR immediately

Remote Work Policy
Remote work is permitted three days per week (Monday, Wednesday, Friday remote; Tuesday and Thursday in office).

Benefits Overview
Our comprehensive benefits package includes:
- Health insurance (medical, dental, vision)
- 401k matching up to 6% of salary
- Professional development allowance of $2,000 per year
- Flexible PTO policy
- 10 company holidays plus 5 personal days

Compensation and Reviews
Annual performance reviews occur in December. Salary adjustments are discussed based on performance and market rates.',
    1234,
    CURRENT_TIMESTAMP
);
