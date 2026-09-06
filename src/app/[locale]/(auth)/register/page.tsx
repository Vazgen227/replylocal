'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Lock, Mail, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function RegisterPage() {
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('auth');

    const [name, setName] = useState('');
    const [bizName, setBizName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            toast.success(t('registerSuccess'));
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
                    <CardTitle className="text-2xl font-bold">{t('register')}</CardTitle>
                    <CardDescription className="text-xs">
                        Создайте рабочее пространство для автоматизации коммуникаций
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="name" className="text-xs">Ваше имя</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="name"
                                    required
                                    placeholder="Алексей"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-9 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="biz" className="text-xs">Название бизнеса</Label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="biz"
                                    required
                                    placeholder="Автосервис Мастер"
                                    value={bizName}
                                    onChange={(e) => setBizName(e.target.value)}
                                    className="pl-9 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="email" className="text-xs">{t('email')}</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="alex@myshop.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="password" className="text-xs">{t('password')}</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9 text-sm"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 pt-2">
                        <Button type="submit" className="w-full h-10 gap-2" disabled={isLoading}>
                            <span>{isLoading ? 'Регистрация...' : t('register')}</span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>

                        <div className="text-center text-xs text-muted-foreground">
                            <Link href={`/${locale}/login`} className="hover:underline">
                                {t('alreadyHaveAccount')}
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
