import type { Metadata } from 'next';
import SignupForm from '@/components/SignupForm';
export const metadata: Metadata = { title: 'Sell smocks on Fuguaa', description: 'Apply to sell your handwoven smocks to buyers across Ghana and beyond.' };
export default function Page() { return <SignupForm seller />; }
