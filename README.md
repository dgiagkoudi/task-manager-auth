# Task Manager Auth

Εφαρμογή Task Manager με authentication για χρήστες, βασισμένο σε Node.js, Express και PostgreSQL. Οι χρήστες μπορούν να εγγραφούν, να συνδεθούν και να διαχειριστούν τις εργασίες τους (προσθήκη, διαγραφή, ολοκλήρωση). Η εφαρμογή χρησιμοποιεί Prisma για ORM και JWT για ασφαλή authentication. Το frontend είναι responsive και λειτουργικό τόσο σε desktop όσο και σε κινητά. 

## Λειτουργίες

- Εγγραφή νέου χρήστη

- Σύνδεση με username/email και password

- Προσθήκη νέας εργασίας

- Σήμανση εργασίας ως ολοκληρωμένη / μη ολοκληρωμένη

- Διαγραφή εργασίας

- Φιλτράρισμα εργασιών (όλα, ολοκληρωμένα, εκκρεμή)

- Αποσύνδεση

## Τεχνολογίες
- Node.js
- Express
- PostgreSQL
- Prisma
- JWT (JSON Web Tokens)
- HTML / CSS / JavaScript
- Deployment σε Render

## Εκκίνηση τοπικά
1. Κλωνοποίησε το repo:

git clone <repo-url>

cd task-manager-auth

2. Εγκατάστησε dependencies:

npm install

3. Δημιούργησε ένα .env αρχείο με τις παρακάτω μεταβλητές:

DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public"

JWT_SECRET="supersecretkey"

ACCESS_TOKEN_EXPIRES_IN=15m

REFRESH_TOKEN_EXPIRES_IN=7d

COOKIE_SECURE=false

4. Δημιούργησε και τρέξε τις migrations:

npx prisma migrate dev --name init

npx prisma generate

5. Εκκίνησε τον server:

npm start
