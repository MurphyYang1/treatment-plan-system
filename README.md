This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Live mobile signatures

This app can use Firebase Firestore for live patient signatures:

1. Copy `.env.example` to `.env.local`.
2. Fill in the `NEXT_PUBLIC_FIREBASE_*` values from your Firebase web app config.
3. Enable Firestore in the Firebase console.
4. Run `npm run dev`, create a quotation, and scan the QR code in the signature section.

When a patient signs on the mobile page, the desktop quotation updates through a Firestore listener. A copy is also saved in the `signedQuotations` collection with an `expiresAt` timestamp 45 days after signing.

To automatically remove signed records, enable Firestore TTL policies for the `expiresAt` field on both collection groups:

- `signedQuotations`
- `signingSessions`

The signed session also stores the signature so the desktop page can update live, so both TTL policies are needed for 45-day retention.

For stricter testing rules, copy `firestore.rules` into Firebase Console > Firestore Database > Rules and publish it. The rules keep QR signing public, but restrict writes to the expected fields, prevent public reads of stored signed quotations, prevent edits after signing, and cap `expiresAt` at 45 days.

## Staff signed quotation viewer

Signed quotations can be viewed at `/admin`. The page uses Firebase Admin on the Next.js server, so saved quotation reads do not need to be public in Firestore rules.

Add these server-only environment variables to your deployment:

- `ADMIN_ACCESS_CODE` - the staff passcode used to unlock `/admin`
- `ADMIN_SESSION_SECRET` - a long random string used to sign the admin cookie
- `FIREBASE_PROJECT_ID` - your Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - service account client email
- `FIREBASE_PRIVATE_KEY` - service account private key

Create the service account values in Firebase Console > Project settings > Service accounts > Generate new private key. In Vercel, paste the private key with newline escapes (`\n`) preserved.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
