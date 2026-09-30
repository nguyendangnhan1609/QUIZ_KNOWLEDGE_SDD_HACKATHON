import { redirect } from 'next/navigation';

export default async function RedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/results/${token}`);
}
