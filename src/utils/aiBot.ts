
/**
 * Call your Supabase edge function to talk to GPT.
 * @param messages Array of messages for OpenAI Chat API 
 * @returns response from the model
 */
import { supabase } from "@/integrations/supabase/client";

export async function askAiBot(messages: {role: string, content: string}[]) {
  const { data, error } = await supabase.functions.invoke("ai-bot", {
    body: { messages },
  });

  if (error) throw new Error(error.message);
  return data?.result;
}
