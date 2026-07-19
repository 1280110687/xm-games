"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import type { TranslationKey } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"

type GameItem = {
  href: string
  titleKey: TranslationKey
  descKey: TranslationKey
  color: string
  customTitle?: React.ReactNode
}

type Category = {
  titleKey: TranslationKey
  games: GameItem[]
}

export default function Home() {
  const { t } = useLocale()

  const categories: Category[] = [
    {
      titleKey: "categoryBoard",
      games: [
        { href: "/chinese-chess", titleKey: "chineseChess", descKey: "chineseChessDescription", color: "text-amber-400" },
        { href: "/chess", titleKey: "chess", descKey: "chessDescription", color: "text-slate-300" },
        { href: "/go", titleKey: "go", descKey: "goDescription", color: "text-amber-500" },
        { href: "/gomoku", titleKey: "gomoku", descKey: "gomokuDescription", color: "text-yellow-400" },
        { href: "/reversi", titleKey: "reversi", descKey: "reversiDescription", color: "text-green-400" },
      ],
    },
    {
      titleKey: "categoryPuzzle",
      games: [
        { href: "/minesweeper", titleKey: "minesweeper", descKey: "minesweeperDescription", color: "text-slate-400" },
        { href: "/2048", titleKey: "game2048", descKey: "game2048Description", color: "text-orange-400" },
        { href: "/sudoku", titleKey: "sudoku", descKey: "sudokuDescription", color: "text-blue-400" },
      ],
    },
    {
      titleKey: "categoryArcade",
      games: [
        { href: "/tetris", titleKey: "tetris", descKey: "tetrisDescription", color: "text-cyan-400" },
        { href: "/snake", titleKey: "snake", descKey: "snakeDescription", color: "text-green-400" },
      ],
    },
    {
      titleKey: "categoryBingo",
      games: [
        { 
          href: "/bingo", 
          titleKey: "bingo", 
          descKey: "bingoDescription", 
          color: "text-white",
          customTitle: (
            <>
              <span className="text-red-500">B</span>
              <span className="text-orange-500">I</span>
              <span className="text-yellow-500">N</span>
              <span className="text-green-500">G</span>
              <span className="text-blue-500">O</span>
            </>
          )
        },
        { 
          href: "/bingo-cards", 
          titleKey: "bingoCardsGame", 
          descKey: "bingoCardsDescription", 
          color: "text-white",
          customTitle: (
            <>
              <span className="text-red-500">B</span>
              <span className="text-orange-500">I</span>
              <span className="text-yellow-500">N</span>
              <span className="text-green-500">G</span>
              <span className="text-blue-500">O</span>
              <span className="ml-2 text-slate-300">{/* Cards handled below */}</span>
            </>
          )
        },
      ],
    },
    {
      titleKey: "categoryTools",
      games: [
        { href: "/anime-tracker", titleKey: "animeTracker", descKey: "animeTrackerDescription", color: "text-pink-400" },
      ],
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 font-sans">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <main className="flex flex-1 flex-col items-center gap-8 px-6 py-8">
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white">
            {t("appName")}
          </h1>
          <p className="max-w-md text-lg text-slate-400">
            {t("selectGame")}
          </p>
        </div>

        <div className="w-full max-w-5xl space-y-8">
          {categories.map((category) => (
            <section key={category.titleKey}>
              <h2 className="mb-4 text-xl font-semibold text-slate-300">
                {t(category.titleKey)}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.games.map((game) => (
                  <Link key={game.href} href={game.href} className="block">
                    <Card className="h-full border-slate-700 bg-slate-800/50 transition-all hover:border-slate-500 hover:bg-slate-800 hover:scale-[1.02]">
                      <CardHeader className="pb-2">
                        <CardTitle className={game.color}>
                          {game.customTitle ? (
                            game.href === "/bingo-cards" ? (
                              <>
                                <span className="text-red-500">B</span>
                                <span className="text-orange-500">I</span>
                                <span className="text-yellow-500">N</span>
                                <span className="text-green-500">G</span>
                                <span className="text-blue-500">O</span>
                                <span className="ml-2 text-slate-300">{t("bingoCards")}</span>
                              </>
                            ) : game.customTitle
                          ) : (
                            t(game.titleKey)
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-400">
                          {t(game.descKey)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
