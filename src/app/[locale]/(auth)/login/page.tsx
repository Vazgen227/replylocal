'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('auth');

    const [email, setEmail] = useState('demo@replylocal.io');
    const [password, setPassword] = useState('••••••••');
    const [isLoading, setIsLoading] = useState(false);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            toast.success(t('loginSuccess'));
            router.push(`/${locale}/dashboard`);
        }, 800);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-md shadow-xl border bg-card">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-lg mb-3 shadow-sm">
                        RL
                    </div>
                    <CardTitle className="text-2xl font-bold">{t('login')}</CardTitle>
                    <CardDescription className="text-xs">
                        Войдите в личный кабинет ReplyLocal AI
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-xs">{t('email')}</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <Label htmlFor="password">{t('password')}</Label>
                                <span className="text-muted-foreground hover:underline cursor-pointer">
                                    {t('forgotPassword')}
                                </span>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9 text-sm"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 pt-2">
                        <Button type="submit" className="w-full h-10 gap-2" disabled={isLoading}>
                            <span>{isLoading ? 'Вход...' : t('login')}</span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>

                        <div className="text-center text-xs text-muted-foreground">
                            <Link href={`/${locale}/register`} className="hover:underline">
                                {t('dontHaveAccount')}
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
