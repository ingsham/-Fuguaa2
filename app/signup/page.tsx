import type { Metadata } from 'next';
import SignupForm from '@/components/SignupForm';
export const metadata: Metadata = { title: 'Create an account', robots: { index: false } };
export default function Page() { return <SignupForm />; }
