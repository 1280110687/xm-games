"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function Home() {
  const { t } = useLocale()

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 font-sans">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-8 text-center">
        <div className="flex flex-col gap-4">
          <h1 className="text-5xl font-bold tracking-tight text-white">
            {t("appName")}
          </h1>
          <p className="max-w-md text-lg text-slate-400">
            {t("selectGame")}
          </p>
        </div>

        <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
          <Link href="/bingo" className="block">
            <Card className="h-full border-slate-700 bg-slate-800/50 transition-all hover:border-slate-500 hover:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-white">
                  <span className="text-red-500">B</span>
                  <span className="text-orange-500">I</span>
                  <span className="text-yellow-500">N</span>
                  <span className="text-green-500">G</span>
                  <span className="text-blue-500">O</span>
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t("bingoGame")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400">
                  {t("bingoDescription")}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/bingo-cards" className="block">
            <Card className="h-full border-slate-700 bg-slate-800/50 transition-all hover:border-slate-500 hover:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-white">
                  <span className="text-red-500">B</span>
                  <span className="text-orange-500">I</span>
                  <span className="text-yellow-500">N</span>
                  <span className="text-green-500">G</span>
                  <span className="text-blue-500">O</span>
                  <span className="ml-2 text-slate-300">{t("bingoCards")}</span>
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t("bingoCardsGame")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400">
                  {t("bingoCardsDescription")}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tetris" className="block">
            <Card className="h-full border-slate-700 bg-slate-800/50 transition-all hover:border-slate-500 hover:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-cyan-400">
                  {t("tetris")}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t("tetris")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400">
                  {t("tetrisDescription")}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/snake" className="block">
            <Card className="h-full border-slate-700 bg-slate-800/50 transition-all hover:border-slate-500 hover:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-green-400">
                  {t("snake")}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t("snake")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400">
                  {t("snakeDescription")}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/anime-tracker" className="block">
            <Card className="h-full border-slate-700 bg-slate-800/50 transition-all hover:border-slate-500 hover:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-pink-400">
                  {t("animeTracker")}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t("animeTrackerShort")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400">
                  {t("animeTrackerDescription")}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/chinese-chess" className="block">
            <Card className="h-full border-slate-700 bg-slate-800/50 transition-all hover:border-slate-500 hover:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-amber-400">
                  {t("chineseChess")}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t("chineseChess")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400">
                  {t("chineseChessDescription")}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
