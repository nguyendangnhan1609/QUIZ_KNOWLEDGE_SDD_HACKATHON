import { redirect } from 'next/navigation';

export default async function DoneRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicToken: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { publicToken } = await params;
  const allParams = await searchParams;

  const queryString = new URLSearchParams();
  for (const [key, value] of Object.entries(allParams)) {
    if (value) {
      queryString.append(key, Array.isArray(value) ? value[0] : value);
    }
  }

  redirect(`/quiz/${publicToken}/done?${queryString.toString()}`);
}
