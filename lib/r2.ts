import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function putR2(key: string, body: ArrayBuffer, contentType: string): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: Buffer.from(body),
      ContentType: contentType,
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteR2(url: string): Promise<void> {
  if (!url.startsWith(PUBLIC_URL)) return;
  const key = url.slice(PUBLIC_URL.length + 1);
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function listR2(): Promise<{ pathname: string; url: string }[]> {
  const results: { pathname: string; url: string }[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) results.push({ pathname: obj.Key, url: `${PUBLIC_URL}/${obj.Key}` });
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);
  return results;
}
