import { ThemeToggle } from '@/components/theme-toggle'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-lg font-bold">F</span>
          </div>
          <span className="hidden font-semibold sm:inline-block">Fullstack Boilerplate</span>
        </div>

        {/* Navigation + Theme Toggle */}
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm font-medium hover:text-primary">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium hover:text-primary">
              Pricing
            </a>
            <a href="#faq" className="text-sm font-medium hover:text-primary">
              FAQ
            </a>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
