type SecretVersion = { version: string; secret: string; active: boolean };

// In a real app this would call a configuration or secrets service.
// For now provide an in-repo implementation to support secret rotation in tests.
export async function getAllSecretVersions(_key: string): Promise<SecretVersion[]> {
  // Order: newest first. Mark one or more as active.
  return [
    { version: "v2", secret: process.env.JWT_SECRET_V2 ?? "secret-v2", active: true },
    { version: "v1", secret: process.env.JWT_SECRET_V1 ?? "secret-v1", active: true },
  ];
}
