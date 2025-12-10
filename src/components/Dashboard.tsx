import { useGenerator } from "./hooks/useGenerator";
import { GeneratorTab } from "./GeneratorTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Toaster } from "./ui/toaster";

/**
 * Main Dashboard component
 *
 * Features:
 * - Tab navigation (Generator / Baza Wiedzy)
 * - State management for Generator tab (lifted to preserve state on tab switch)
 * - Integration with useGenerator hook
 * - Toast notifications
 */
export function Dashboard() {
  const { state, actions } = useGenerator();

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">10xCards</h1>
        <p className="text-muted-foreground mt-2">Twórz fiszki szybciej dzięki AI</p>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="generator">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4 mr-2"
              aria-hidden="true"
            >
              <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684zM13.949 13.684a1 1 0 00-1.898 0l-.184.551a1 1 0 01-.632.633l-.551.183a1 1 0 000 1.898l.551.183a1 1 0 01.633.633l.183.551a1 1 0 001.898 0l.184-.551a1 1 0 01.632-.633l.551-.183a1 1 0 000-1.898l-.551-.184a1 1 0 01-.633-.632l-.183-.551z" />
            </svg>
            Generator
          </TabsTrigger>
          <TabsTrigger value="knowledge-base">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4 mr-2"
              aria-hidden="true"
            >
              <path d="M10.75 16.82A7.462 7.462 0 0115 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0018 15.06v-11a.75.75 0 00-.546-.721A9.006 9.006 0 0015 3a8.963 8.963 0 00-4.25 1.065V16.82zM9.25 4.065A8.963 8.963 0 005 3c-.85 0-1.673.118-2.454.339A.75.75 0 002 4.06v11a.75.75 0 00.954.721A7.506 7.506 0 015 15.5c1.579 0 3.042.487 4.25 1.32V4.065z" />
            </svg>
            Baza Wiedzy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator">
          <GeneratorTab state={state} actions={actions} />
        </TabsContent>

        <TabsContent value="knowledge-base">
          <div className="text-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-12 mx-auto text-muted-foreground mb-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            <h3 className="text-lg font-semibold mb-2">Baza Wiedzy</h3>
            <p className="text-muted-foreground">Ta sekcja będzie dostępna wkrótce</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}
