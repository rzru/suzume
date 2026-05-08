import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Callout,
  Dialog,
  Flex,
  IconButton,
  Select,
  Spinner,
  Switch,
  Text,
} from "@radix-ui/themes";
import { ExclamationTriangleIcon, GearIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useAppSettings } from "../../hooks/useAppSettings";
import { useAvailableModelsQuery } from "../../hooks/useAvailableModelsQuery";
import { FALLBACK_POPULAR_MODELS } from "../../api/models";

const AUTO_VALUE = "__auto__";

const TARGET_LANGUAGES: { code: string; label: string }[] = [
  { code: "English", label: "English" },
  { code: "Spanish", label: "Spanish" },
  { code: "French", label: "French" },
  { code: "German", label: "German" },
  { code: "Italian", label: "Italian" },
  { code: "Portuguese", label: "Portuguese" },
  { code: "Polish", label: "Polish" },
  { code: "Russian", label: "Russian" },
  { code: "Ukrainian", label: "Ukrainian" },
  { code: "Japanese", label: "Japanese" },
  { code: "Korean", label: "Korean" },
  { code: "Chinese", label: "Chinese" },
  { code: "Arabic", label: "Arabic" },
  { code: "Hindi", label: "Hindi" },
  { code: "Turkish", label: "Turkish" },
];

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const { model, targetLanguage, think, setModel, setTargetLanguage, setThink } = useAppSettings();

  const { data, isFetching, isError, refetch } = useAvailableModelsQuery(open);

  const [draftModel, setDraftModel] = useState<string | null>(model);
  const [draftLanguage, setDraftLanguage] = useState<string | null>(targetLanguage);
  const [draftThink, setDraftThink] = useState<boolean>(think);

  useEffect(() => {
    if (open) {
      setDraftModel(model);
      setDraftLanguage(targetLanguage);
      setDraftThink(think);
    }
  }, [open, model, targetLanguage, think]);

  const modelOptions = useMemo(() => {
    const fetched = data?.models?.map((m) => m.name) ?? [];
    const base = fetched.length > 0 ? fetched : FALLBACK_POPULAR_MODELS;
    const merged = new Set(base);
    if (model) merged.add(model);
    if (draftModel) merged.add(draftModel);
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [data, model, draftModel]);

  const handleSave = () => {
    setModel(draftModel);
    setTargetLanguage(draftLanguage);
    setThink(draftThink);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton variant="ghost" color="gray" size="2" aria-label="Open settings">
          <GearIcon />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>Settings</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Pick the local Ollama model and the language used in translate "Into another language"
          mode.
        </Dialog.Description>

        <Flex direction="column" gap="4">
          <Box>
            <Flex align="center" justify="between" mb="1">
              <Text as="label" size="2" weight="medium">
                Model
              </Text>
              <IconButton
                size="1"
                variant="ghost"
                color="gray"
                aria-label="Refresh model list"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? <Spinner size="1" /> : <ReloadIcon />}
              </IconButton>
            </Flex>
            <Select.Root
              value={draftModel ?? AUTO_VALUE}
              onValueChange={(value) => setDraftModel(value === AUTO_VALUE ? null : value)}
            >
              <Select.Trigger placeholder="Server default" style={{ width: "100%" }} />
              <Select.Content position="popper">
                <Select.Item value={AUTO_VALUE}>Server default</Select.Item>
                <Select.Separator />
                {modelOptions.map((name) => (
                  <Select.Item key={name} value={name}>
                    {name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            {isError && (
              <Callout.Root color="amber" size="1" mt="2">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  Could not reach Ollama. Showing a curated list of popular models.
                </Callout.Text>
              </Callout.Root>
            )}
          </Box>

          <Box>
            <Text as="label" size="2" weight="medium">
              Target language
            </Text>
            <Select.Root
              value={draftLanguage ?? AUTO_VALUE}
              onValueChange={(value) => setDraftLanguage(value === AUTO_VALUE ? null : value)}
            >
              <Select.Trigger placeholder="Auto" style={{ width: "100%" }} />
              <Select.Content position="popper">
                <Select.Item value={AUTO_VALUE}>Auto (English / Spanish)</Select.Item>
                <Select.Separator />
                {TARGET_LANGUAGES.map((language) => (
                  <Select.Item key={language.code} value={language.code}>
                    {language.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Text as="p" size="1" color="gray" mt="1">
              Used in translate "Into another language" mode. Other modes always use the card's
              language.
            </Text>
          </Box>

          <Box>
            <Flex align="center" justify="between" gap="3">
              <Text as="label" size="2" weight="medium" htmlFor="think-toggle">
                Reasoning ("think")
              </Text>
              <Switch id="think-toggle" checked={draftThink} onCheckedChange={setDraftThink} />
            </Flex>
            <Text as="p" size="1" color="gray" mt="1">
              Some models (e.g. qwen3, deepseek-r1) reason before answering. Turning this off speeds
              up replies but may reduce quality.
            </Text>
          </Box>
        </Flex>

        <Flex justify="end" gap="3" mt="5">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={handleSave}>Save</Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
