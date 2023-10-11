import { api } from "@/lib/axios";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface PromptSelectProps {
  onPromptSelected: (template:string) => void;
}

interface Prompt {
  id: string;
  title: string;
  template: string;
}

export function PromptSelect({ onPromptSelected }: PromptSelectProps) {

  const [prompt, setPrompt] = useState<Prompt[] | null>(null)

  function handlePromptSelected(promptId: string) {
    const selectedPrompt = prompt?.find(prompt => prompt.id === promptId)

    if  (!selectedPrompt) return 

    onPromptSelected(selectedPrompt.template)

  }

  useEffect(() => {
    api.get('/prompts').then(response => {
      setPrompt(response.data)
    })
  }, [])

  return (
    <Select onValueChange={handlePromptSelected}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um prompt..." />
      </SelectTrigger>
      <SelectContent>
        {prompt?.map(prompt => {
          return (
            <SelectItem key={prompt.id} value={prompt.id}>
              {prompt.title}
            </SelectItem>
          )
        })}        
      </SelectContent>
    </Select>
  );
}
