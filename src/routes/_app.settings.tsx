import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutomationsSection, CommandHistory, DevicesSection, SensorsSection } from "@/components/settings/ConfigSections";
import { CameraSection, DemoSection, GatewaySection, ProjectSection, TelegramSection, ThingSpeakSection } from "@/components/settings/ConnectionSections";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Smart Room" },
      { name: "description", content: "Configure sensors, devices, connections and automations." },
      { property: "og:title", content: "Settings — Smart Room" },
      { property: "og:description", content: "Configure sensors, devices, connections and automations." },
    ],
  }),
  component: Settings,
});

function Settings() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Set up your room, hardware connections and rules." />
      <Tabs defaultValue="project">
        <TabsList className="mb-5 flex h-auto flex-wrap justify-start">
          <TabsTrigger value="project">Project</TabsTrigger>
          <TabsTrigger value="sensors">Sensors</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="project" className="space-y-5"><ProjectSection /></TabsContent>
        <TabsContent value="sensors"><SensorsSection /></TabsContent>
        <TabsContent value="devices"><DevicesSection /></TabsContent>
        <TabsContent value="connections" className="space-y-5"><ThingSpeakSection /><GatewaySection /><TelegramSection /><CameraSection /></TabsContent>
        <TabsContent value="automations"><AutomationsSection /></TabsContent>
        <TabsContent value="history"><CommandHistory /></TabsContent>
      </Tabs>
    </>
  );
}
