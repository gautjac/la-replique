// Minimal CloudKit JS client for the read-only public viewer. Reads a
// PublicPlay record (recordName == shareID) from the public database using the
// origin-restricted web API token.
const TOKEN = import.meta.env.VITE_CLOUDKIT_TOKEN as string | undefined;
const CONTAINER = "iCloud.app.atelier.lareplique";
const ENVIRONMENT = "development"; // switch to "production" once the schema is deployed

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCK = any;

let ckPromise: Promise<AnyCK> | null = null;

export function hasToken(): boolean {
  return !!TOKEN;
}

function loadCloudKit(): Promise<AnyCK> {
  if (ckPromise) return ckPromise;
  ckPromise = new Promise<AnyCK>((resolve, reject) => {
    const existing = (window as unknown as { CloudKit?: AnyCK }).CloudKit;
    if (existing) return resolve(existing);
    const s = document.createElement("script");
    s.src = "https://cdn.apple-cloudkit.com/ck/2/cloudkit.js";
    s.async = true;
    s.onload = () => {
      const CloudKit = (window as unknown as { CloudKit?: AnyCK }).CloudKit;
      CloudKit ? resolve(CloudKit) : reject(new Error("CloudKit unavailable"));
    };
    s.onerror = () => reject(new Error("CloudKit script failed to load"));
    document.head.appendChild(s);
  }).then((CloudKit: AnyCK) => {
    CloudKit.configure({
      containers: [
        {
          containerIdentifier: CONTAINER,
          apiTokenAuth: { apiToken: TOKEN, persist: false },
          environment: ENVIRONMENT,
        },
      ],
    });
    return CloudKit;
  });
  return ckPromise;
}

/** Fetch a published play's `la-replique/1` JSON string by its shareID, or null. */
export async function fetchPublicPlayJSON(shareID: string): Promise<string | null> {
  if (!TOKEN) throw new Error("no-token");
  const CloudKit = await loadCloudKit();
  const db = CloudKit.getDefaultContainer().publicCloudDatabase;
  const response = await db.fetchRecords([shareID]);
  if (response.hasErrors && response.hasErrors()) {
    // a "record not found" comes back as an error per-record; treat as null
    return null;
  }
  const record = response.records && response.records[0];
  const value = record?.fields?.json?.value;
  return typeof value === "string" ? value : null;
}
