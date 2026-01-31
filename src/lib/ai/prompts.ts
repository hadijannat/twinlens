/**
 * Prompt Templates
 * System prompts and helper functions for AI chat
 */

import type { AssetContext } from './types';
import { formatContextForPrompt } from './context';

export function buildSystemPrompt(context: AssetContext): string {
  const contextSection = formatContextForPrompt(context);

  return `You are an AI assistant helping users understand a Digital Product Passport (DPP) based on the Asset Administration Shell (AAS) standard.

## Your Role
- Answer questions about the loaded asset based on the provided data
- Explain technical specifications, compliance information, and documentation
- Help users understand the structure and content of the AAS
- Provide accurate, grounded responses citing specific data when possible

## Response Guidelines
1. **Be accurate**: Only state facts present in the data. If information isn't available, say so.
2. **Cite sources**: When referencing specific data values, use the citation format: [Value](Submodel.PropertyName)
   - Example: The manufacturer is [Siemens AG](Nameplate.ManufacturerName).
   - Example: The carbon footprint is [1234.5 kg CO2eq](CarbonFootprint.PCFCO2eq).
3. **Be concise**: Provide direct answers, then elaborate if needed.
4. **Use context**: Reference the asset by its name/ID when appropriate.
5. **Explain terminology**: Help users understand AAS concepts when relevant.

## Asset Data

${contextSection}

## Important Notes
- This data comes from an AAS environment file (AASX or JSON)
- Semantic IDs reference standard definitions (IRDI, IRI)
- Document references point to files within the AASX package`;
}

export function generateSuggestedQuestions(context: AssetContext): string[] {
  const questions: string[] = [];
  const assetName = context.assetIdShort || 'this product';

  // Collect all properties across submodels for smarter suggestions
  const allProperties = new Map<string, string>();
  const templates = new Set<string>();

  for (const summary of context.submodelSummaries) {
    if (summary.templateType) {
      templates.add(summary.templateType);
    }
    for (const [key, value] of Object.entries(summary.keyProperties)) {
      allProperties.set(key.toLowerCase(), value);
    }
  }

  // Always start with a general question
  questions.push(`What can you tell me about ${assetName}?`);

  // Template-specific questions with property awareness
  if (templates.has('nameplate')) {
    // Check for specific manufacturer info
    if (allProperties.has('serialnumber')) {
      questions.push('What is the serial number and manufacturing date?');
    } else {
      questions.push('Who manufactured this and where was it made?');
    }
  }

  if (templates.has('carbon_footprint')) {
    // Check for PCF data
    const hasPcfValue = [...allProperties.keys()].some(
      (k) => k.includes('co2') || k.includes('carbon')
    );
    if (hasPcfValue) {
      questions.push('How does the carbon footprint break down by lifecycle phase?');
    } else {
      questions.push('What is the environmental impact of this product?');
    }
  }

  if (templates.has('technical_data')) {
    questions.push('What are the key technical specifications?');
  }

  if (templates.has('handover_documentation')) {
    // Check document count
    const docCount = allProperties.get('documentcount');
    if (docCount && parseInt(docCount, 10) > 0) {
      questions.push(`What are the ${docCount} available documents about?`);
    } else {
      questions.push('What documentation is available?');
    }
  }

  // Smart fallback questions based on available data
  if (questions.length < 4) {
    // Check for warranty or maintenance info
    const hasWarranty = [...allProperties.keys()].some(
      (k) => k.includes('warranty') || k.includes('maintenance')
    );
    if (hasWarranty) {
      questions.push('What are the warranty and maintenance requirements?');
    }

    // Check for certification/compliance info
    const hasCertification = [...allProperties.keys()].some(
      (k) => k.includes('certification') || k.includes('marking') || k.includes('compliance')
    );
    if (hasCertification) {
      questions.push('What certifications does this product have?');
    }
  }

  // Add a compliance question if we still have room
  if (questions.length < 4) {
    questions.push('Is this product compliant with relevant regulations?');
  }

  // Return unique questions, limited to 4
  return [...new Set(questions)].slice(0, 4);
}
