
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
import { AppearanceSettings as AppearanceSettingsType } from "@/types/settings";
import { Sun, Moon, Monitor, Palette } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

interface AppearanceSettingsProps {
  settings: AppearanceSettingsType;
  updateSettings: (values: Partial<AppearanceSettingsType>) => void;
}

export default function AppearanceSettings({ settings, updateSettings }: AppearanceSettingsProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  // The theme is primarily managed by the global ThemeProvider context.
  // We don't automatically override it here to prevent toggle conflicts with the Header.

  const accentColors = [
    { value: "#8B5CF6", label: "Purple (Default)" },
    { value: "#0EA5E9", label: "Blue" },
    { value: "#10B981", label: "Green" },
    { value: "#F97316", label: "Orange" },
    { value: "#F43F5E", label: "Red" },
  ];

  const handleThemeChange = (value: "light" | "dark" | "system") => {
    setTheme(value);
    updateSettings({ theme: value });
  };

  const handleAccentColorChange = (color: string) => {
    // Update the accent color CSS variable
    document.documentElement.style.setProperty('--primary', color);
    updateSettings({ accentColor: color });
    
    // Force a UI update of components that use the primary color
    const root = document.documentElement;
    root.classList.add('color-updated');
    setTimeout(() => root.classList.remove('color-updated'), 10);
  };

  const handleSaveChanges = () => {
    // Apply all settings at once
    setTheme(settings.theme);
    document.documentElement.style.setProperty('--primary', settings.accentColor);
    
    // Toggle compact view based on setting
    if (settings.compactView) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
    
    // Notify the user
    toast({
      title: "Appearance updated",
      description: "Your appearance settings have been saved.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Theme</Label>
          <RadioGroup
            value={theme}
            onValueChange={(value: "light" | "dark" | "system") => handleThemeChange(value)}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="theme-light" />
              <Label htmlFor="theme-light" className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Light
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="theme-dark" />
              <Label htmlFor="theme-dark" className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="theme-system" />
              <Label htmlFor="theme-system" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                System
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Accent Color
          </Label>
          <div className="grid grid-cols-5 gap-2">
            {accentColors.map((color) => (
              <Button
                key={color.value}
                type="button"
                variant="outline"
                className={`p-0 h-8 w-8 rounded-full border-2 ${
                  settings.accentColor === color.value 
                    ? "border-primary" 
                    : "border-transparent"
                }`}
                style={{ backgroundColor: color.value }}
                onClick={() => handleAccentColorChange(color.value)}
                title={color.label}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="space-y-0.5">
            <Label htmlFor="compactView">Compact View</Label>
            <p className="text-sm text-muted-foreground">
              Use less whitespace for a more dense layout
            </p>
          </div>
          <Switch
            id="compactView"
            checked={settings.compactView}
            onCheckedChange={(checked) => updateSettings({ compactView: checked })}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="space-y-0.5">
            <Label htmlFor="showAvatars">Show Avatars</Label>
            <p className="text-sm text-muted-foreground">
              Display user avatars throughout the interface
            </p>
          </div>
          <Switch
            id="showAvatars"
            checked={settings.showAvatars}
            onCheckedChange={(checked) => updateSettings({ showAvatars: checked })}
          />
        </div>
      </div>

      <Button type="button" onClick={handleSaveChanges} className="bg-primary text-primary-foreground">
        Save Changes
      </Button>
    </div>
  );
}
