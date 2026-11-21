# LabPresensi Sprint 3 — Android notification integration

The [integration patch](sprint-3-notifications-integration.patch) is based on the shared files at `f57136c`. It prepares the runtime, auth hook, routes, native configuration, and Cloud Functions entry point for integrator review. Apply it on an integration branch after approval. The patch has been checked for applicability and type-checked using a virtual source overlay and the SDK declarations. The working checkout and Firebase project have not received the shared-file changes.

## Changes in the working tree

| File | Reason |
|---|---|
| `src/features/notifications/services/notificationTokenService.ts` | Blocks new registrations for the outgoing UID during revocation and Auth sign-out. Exposes `finishLogout` for the runtime to release the guard. |
| `src/features/notifications/notificationLifecycle.ts` | Keeps a tap pending if navigation throws so the runtime can retry it when the router or app becomes ready. |
| `src/features/notifications/notificationNavigation.ts` | Adds the recipient UID to internal route parameters so the shared entry point can reject a stale target after an account change. |
| `src/features/notifications/__tests__/notificationClient.test.ts` | Covers the logout race, recoverable navigation failure, and UID-bound route parameters. |
| `functions/src/notifications/firestoreNotificationStore.ts` | Saves the initial audience transactionally and intersects it with the latest eligible audience on every dispatch attempt. |
| `functions/src/notifications/notificationFunctions.ts` | Applies the audience guard, supplies the stable Android data tag alongside the native notification tag, and limits FCM storage to five minutes. |
| `functions/src/notifications/__tests__/notificationFunctions.test.ts` | Covers a replay after one participant leaves and a new participant joins. |
| `docs/sprint-3-notifications-integration.patch` | Keeps shared-file integration available as a reviewable diff. |
| `docs/sprint-3-notifications-android-handoff.md` | Records approvals, verification, staging setup, and the device checklist. |

## Files proposed by the patch

| Proposed files | Reason |
|---|---|
| `app.json` | Configures the notifications and SecureStore plugins and reads the Android Firebase configuration through CNG. |
| `firebase.json`, `functions/package.json`, `functions/tsconfig.json`, `functions/.gitignore` | Scaffolds Functions with Node 22 and a build command. Excludes compiled output from Git and module tests from the deployed build. |
| `functions/src/index.ts` | Registers token callables and `sesi`/`izin` update triggers for the four event types. Adds a once-per-minute scheduled source for Sprint 2 sessions whose effective opening does not write `sesi.status`. The scheduler re-reads candidates, checks the active time window, and uses a stable source ID per session and start time. |
| `src/app/_layout.tsx`, `src/features/notifications/NotificationRuntime.tsx` | Mount the Android notification bridge after the auth provider. Start tracking on an eligible signed-in profile. Refresh at resume, offer permission retry, attach tap listeners, and flush after router readiness. |
| `src/features/auth/AuthContext.tsx` | Offers the bridge an optional wrapper around both sign-out paths. The original Auth sign-out still runs if token cleanup fails or exceeds two seconds, preserving offline logout. The wrapper checks the current UID again before invoking Auth. |
| `src/app/index.tsx`, `src/navigation/AppRouter.tsx` | Read the internal notification parameters, match the recipient UID to the active profile, and forward the target to the existing role tabs. |
| `src/navigation/PraktikanTabs.tsx`, `src/features/jadwal/JadwalTab.tsx`, `src/features/izin/IzinSayaTab.tsx` | Open the existing schedule detail or focus an existing leave row using the student’s authorized subscriptions. |
| `src/navigation/AsistenTabs.tsx`, `src/features/kelola/KelolaTab.tsx`, `src/features/kelola/SesiTab.tsx` | Open session management and focus the requested session using the assistant’s existing subscription. |

## Approval and staging setup

1. Approve the shared patch, scheduled opening policy, and Functions region. The proposal uses `us-central1` on both sides, a 20-minute scheduler lookback, and an active-session check. Approve the Scheduler resource and billing before deployment. `SCHEDULE_CHANGED` covers start and end times. Confirm location-only changes with Programmer 2 before expanding that contract. [Firebase scheduled Functions](https://firebase.google.com/docs/functions/schedule-functions)
2. Approve the backend-only audience record at `notificationEvents/{sourceKey}/audience/initial` and its retention. Keep both audience and delivery state through the trigger replay window. The existing deny-by-default Rules cover the new paths. Review this in the combined Rules before deployment. The patch contains no Rules edit. The scheduler uses a range on `sesi.startAt`; the token registry uses single-field equality queries.
3. After approval, run `git apply --check docs/sprint-3-notifications-integration.patch` and apply it. Run `npx expo install expo-notifications expo-crypto expo-secure-store`, `npx expo-doctor`, and the app lint and typecheck. With Node 22, run `npm --prefix functions install` and `npm --prefix functions run build`. Review both generated lockfiles. [Expo SDK 58 Notifications](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/)
4. Prepare an approved staging Firebase project with Auth, Firestore, Cloud Functions, Cloud Scheduler, and FCM. Use managed backend credentials and confirm messaging IAM. Register the Android app for `com.labpresensi.app`, supply its staging `google-services.json` through the local/EAS build environment, and point the JS Firebase variables to the same staging project. Keep service account private keys on the backend. Set `EXPO_PUBLIC_ENABLE_NOTIFICATIONS=1` for the staging app runtime. Deploy the reviewed Functions only after staging deployment authorization.
5. Use the existing Android APK profile with `npx eas-cli@latest build --platform android --profile development`. Install it on a Google Play Services device. Start the development client with the staging environment. [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/)

The two-second cleanup budget and short FCM TTL reduce the stale-binding window while preserving offline sign-out. Android may still show a generic push already accepted by FCM. The app filters foreground display and tap navigation by UID. Token refresh recovery and duplicate display across ambiguous transport retries still need staging evidence. If strict suppression on shared devices is required, settle that delivery policy before release. [FCM message lifespan](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-lifespan)

## Physical Android checklist

- [ ] Start the approved staging build with notifications disabled and verify ordinary sign-in, sign-out, and tab navigation. Then enable notifications and verify permission grant, denial, retry, and Android channel settings.
- [ ] Sign in as student A. Verify one active server binding for A, correct revision and platform, and denial of direct Firestore reads/writes to token and event paths from app accounts.
- [ ] Rotate the device token and verify that the old token stops receiving new sends. Verify that an invalid-token result cannot disable a newer binding.
- [ ] Log out as A while a registration or foreground resume is in flight. Sign in as B on the same device. Repeat with airplane mode and reconnect. Verify that logout completes, B becomes the active binding, and a queued A notification cannot open A’s data.
- [ ] Test manual `SESSION_OPENED`, scheduled `SESSION_OPENED`, `SCHEDULE_CHANGED`, `PERMISSION_APPROVED`, and `PERMISSION_REJECTED`. Use a relevant student, a relevant assistant, and an unrelated control account. Record expected and actual recipients.
- [ ] Replay an event concurrently, including after adding or removing a roster member. Verify no new recipients on replay and no duplicate display on the tested Android presentation paths. Exercise a retryable send failure and an invalid token.
- [ ] Test foreground, background, and terminated app states. Tap a schedule notification as each relevant role and a leave notification as its owner. Confirm the exact authorized session or leave row opens. Confirm an unrelated target opens no restricted record. Record Android force-stop behavior separately.
- [ ] Repeat Sprint 2 attendance, recap, and leave flows on the same build. Capture device, OS, build version, test account role, and outcome. Keep tokens and credentials out of evidence.

## Verification

- The working checkout passed Expo lint, TypeScript, Git whitespace checks, and 16 notification module tests. The proposed patch passed `git apply --check` and virtual TypeScript checking against Expo SDK 58 and the proposed Firebase SDK declarations. This does not exercise the registered Functions or build an APK.
- The existing Sprint 2 suite passed all 12 groups against local Firebase Auth and Firestore Emulator 1.22.0 using Java 21 and Firebase CLI 15.36.0. A temporary runner stubbed the Expo icon module for Node and used the current `Beranda` label. The previously failing assistant recap listener passed following the offline attendance write. The prior 1.19.8/Java 17 timeout was not reproduced. This supports an emulator-stack contribution without identifying which component caused the old timeout.
- Physical Android delivery, staging Firebase trigger execution, and the checklist above remain **Not Tested**.
