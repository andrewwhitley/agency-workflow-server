/**
 * SOP Parser
 * Parse SOP documents into structured steps and convert to WorkflowDefinitions.
 */

import { IndexedDocument } from "./document-indexer.js";
import { WorkflowDefinition, WorkflowContext } from "./workflow-engine.js";

export interface SOPStep {
  stepNumber: number;
  title: string;
  description: string;
  checklist: string[];
}

export interface ParsedSOP {
  id: string;
  name: string;
  client: string | null;
  steps: SOPStep[];
  rawContent: string;
}

export class SOPParser {
  parse(doc: IndexedDocument): ParsedSOP {
    const steps = this.extractSteps(doc.content);
    const name = doc.name.replace(/\.(md|txt|docx|pdf|gdoc)$/i, "");

    return {
      id: doc.id,
      name,
      client: doc.client,
      steps,
      rawContent: doc.content,
    };
  }

  toWorkflow(parsed: ParsedSOP, client?: string): WorkflowDefinition {
    const workflowName = `sop-${parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}${client ? `-${client.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""}`;

    const workflowSteps = parsed.steps.map((step) => ({
      id: `step_${step.stepNumber}`,
      description: step.title,
      action: async (ctx: WorkflowContext): Promise<unknown> => {
        ctx.log(`Executing SOP step ${step.stepNumber}: ${step.title}`);
        ctx.log(`Description: ${step.description}`);
        if (step.checklist.length) {
          ctx.log(`Checklist items: ${step.checklist.length}`);
          for (const item of step.checklist) {
            ctx.log(`  - ${item}`);
          }
        }
        return {
          stepNumber: step.stepNumber,
          title: step.title,
          description: step.description,
          checklist: step.checklist,
          status: "completed",
        };
      },
    }));

    return {
      name: workflowName,
      description: `SOP Workflow: ${parsed.name}${client ? ` (${client})` : ""}`,
      steps: workflowSteps,
      inputs: {
        notes: {
          type: "string",
          description: "Additional notes or context for this SOP run",
          required: false,
          default: "",
        },
      },
      tags: ["sop", "auto-generated"],
      category: "SOPs",
    };
  }

  private extractSteps(content: string): SOPStep[] {
    const steps: SOPStep[] = [];
    const lines = content.split("\n");

    let currentStep: SOPStep | null = null;
    let collectingDescription = false;
    let stepCounter = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Match headers like "## Step 1: Title" or "### Step 2 - Title" or "# 1. Title"
      const stepMatch = trimmed.match(
        /^#{1,4}\s*(?:step\s*)?(\d+)[.:)\-]\s*(.+)/i
      );

      if (stepMatch) {
        if (currentStep) steps.push(currentStep);
        stepCounter++;
        currentStep = {
          stepNumber: parseInt(stepMatch[1]) || stepCounter,
          title: stepMatch[2].trim(),
          description: "",
          checklist: [],
        };
        collectingDescription = true;
        continue;
      }

      // Match numbered headers without "step" keyword like "## 1. Title"
      const numberedMatch = trimmed.match(/^#{1,4}\s+(\d+)\.\s+(.+)/);
      if (numberedMatch && !currentStep) {
        stepCounter++;
        currentStep = {
          stepNumber: parseInt(numberedMatch[1]) || stepCounter,
          title: numberedMatch[2].trim(),
          description: "",
          checklist: [],
        };
        collectingDescription = true;
        continue;
      }

      if (!currentStep) continue;

      // Match checklist items: "- [ ] item", "- [x] item", "- item", "* item"
      const checklistMatch = trimmed.match(/^[-*]\s*(\[.\])?\s*(.+)/);
      if (checklistMatch) {
        currentStep.checklist.push(checklistMatch[2].trim());
        collectingDescription = false;
        continue;
      }

      // Collect description text
      if (collectingDescription && trimmed.length > 0 && !trimmed.startsWith("#")) {
        currentStep.description += (currentStep.description ? " " : "") + trimmed;
      }
    }

    if (currentStep) steps.push(currentStep);

    // If no structured steps found, create a single step from the whole content
    if (steps.length === 0 && content.trim().length > 0) {
      steps.push({
        stepNumber: 1,
        title: "Execute SOP",
        description: content.slice(0, 500),
        checklist: [],
      });
    }

    return steps;
  }
}
