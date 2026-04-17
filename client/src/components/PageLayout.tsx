import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import backgroundImg from '../imports/image-0.jpg'

type PageLayoutProps = {
  subtitle?: string
  showBack?: boolean
  children: React.ReactNode
}

export function PageLayout({ subtitle, showBack, children }: PageLayoutProps) {
  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/45" aria-hidden />
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/30 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-3 md:flex-row md:justify-center md:py-4">
          {showBack ? (
            <Link
              to="/"
              className="pointer-events-auto absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 md:left-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          ) : null}
          <h1 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            GYMKHANA UNION BODY ELECTION
          </h1>
        </div>
        {subtitle ? (
          <p className="border-t border-slate-200/80 bg-white/90 py-2 text-center text-sm font-medium text-slate-600 backdrop-blur-sm">
            {subtitle}
          </p>
        ) : null}
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-[7.5rem] md:pt-32">{children}</main>
    </div>
  )
}
