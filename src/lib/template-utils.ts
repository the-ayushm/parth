/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Utility functions for handling WhatsApp Message Templates and their variables.
 */
export type TemplateButton = {
  id: string;
  label: string;
  type: "quick_reply" | "url" | "phone";
};

/**
 * Extracts buttons from template components into { id, label, type } format.
 * Normalizes QUICK_REPLY, URL, PHONE_NUMBER to quick_reply, url, phone.
 */
export function getTemplateButtons(components: any[]): TemplateButton[] {
  if (!Array.isArray(components)) return [];
  const buttonsComponent = components.find((c: any) => c.type === "BUTTONS");
  if (!buttonsComponent?.buttons?.length) return [];
  const typeMap: Record<string, "quick_reply" | "url" | "phone"> = {
    QUICK_REPLY: "quick_reply",
    URL: "url",
    PHONE_NUMBER: "phone",
  };
  return buttonsComponent.buttons.map((btn: any, idx: number) => {
    const t = typeMap[btn.type] || "quick_reply";
    const id = t === "quick_reply" ? `qr_${idx}` : `${t}_${idx}`;
    return {
      id,
      label: btn.text || `Button ${idx + 1}`,
      type: t as "quick_reply" | "url" | "phone",
    };
  });
}

export type TemplateVariable = {
  name: string; // The variable name/index, e.g., "1" or "first_name"
  component: "HEADER" | "BODY" | "BUTTON";
  originalMatch: string; // The full match, e.g., "{{1}}"
  index?: number; // For buttons, the button index (0, 1, or 2)
};

/**
 * Extracts all variables from a template's components.
 * Supports positional {{1}} and named {{var_name}} formats.
 */
export function getTemplateVariables(components: any[]): TemplateVariable[] {
  const variables: TemplateVariable[] = [];
  const seen = new Set<string>();

  if (!Array.isArray(components)) return [];

  components.forEach((component) => {
    if (
      (component.type === "BODY" ||
        (component.type === "HEADER" && component.format === "TEXT")) &&
      component.text
    ) {
      // Regex to match {{anything}}
      const regex = /\{\{([^}]+)\}\}/g;
      let match;

      while ((match = regex.exec(component.text)) !== null) {
        const varName = match[1].trim();
        const key = `${component.type}:${varName}`;

        if (!seen.has(key)) {
          variables.push({
            name: varName,
            component: component.type as "HEADER" | "BODY",
            originalMatch: match[0],
          });
          seen.add(key);
        }
      }
    }
    if (component.type === "BUTTONS" && Array.isArray(component.buttons)) {
      component.buttons.forEach((btn: any, btnIdx: number) => {
        if (btn.type === "URL" && btn.url) {
          const regex = /\{\{([^}]+)\}\}/g;
          let match;
          while ((match = regex.exec(btn.url)) !== null) {
            const varName = match[1].trim();
            const key = `BUTTON:${btnIdx}:${varName}`;
            if (!seen.has(key)) {
              variables.push({
                name: varName,
                component: "BUTTON",
                originalMatch: match[0],
                index: btnIdx,
              });
              seen.add(key);
            }
          }
        }
      });
    }
  });

  // Sort positional variables numerically if possible, otherwise keep alphabetical
  return variables.sort((a, b) => {
    const numA = parseInt(a.name);
    const numB = parseInt(b.name);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Builds header parameters for Meta's API based on template header format.
 * Supports TEXT, IMAGE, VIDEO, and DOCUMENT header types.
 *
 * IMPORTANT: For media headers when SENDING, Meta accepts:
 * - link: Public HTTPS URL (recommended)
 * - id: Media ID from WhatsApp Media API (/{phone_number_id}/media)
 *
 * The header_handle from template CREATION (Resumable Upload API) is NOT valid
 * for sending - it causes "Media upload error". User must provide a URL or
 * upload a file to get a fresh media ID.
 */
function buildHeaderParams(
  components: any[],
  variables: TemplateVariable[],
  values: Record<string, string>,
): any[] {
  const headerComp = Array.isArray(components)
    ? components.find((c: any) => c.type === "HEADER")
    : null;
  if (!headerComp) return [];

  const format = (headerComp.format || "TEXT").toUpperCase();

  const normalizeMediaValue = (v: string) => {
    const trimmed = (v || "").trim();
    // Users often paste URL with wrapping quotes/brackets from chat/docs.
    return trimmed.replace(/^["'`<\[]+|["'`>\]]+$/g, "").trim();
  };

  const isUrl = (v: string) => {
    const normalized = normalizeMediaValue(v);
    return /^https?:\/\//i.test(normalized);
  };
  // Use user-provided values only. Do NOT fall back to header_handle - it's from
  // Resumable Upload (template creation) and is invalid for the Messages API.
  // User must provide: HTTPS URL (link) or media ID from upload (id).

  if (format === "IMAGE") {
    const urlOrId = normalizeMediaValue(values["headerImageUrl"] || "");
    if (!urlOrId) return [];
    return [
      {
        type: "image",
        image: isUrl(urlOrId) ? { link: urlOrId } : { id: urlOrId },
      },
    ];
  }
  if (format === "VIDEO") {
    const urlOrId = normalizeMediaValue(values["headerVideoUrl"] || "");
    if (!urlOrId) return [];
    return [
      {
        type: "video",
        video: isUrl(urlOrId) ? { link: urlOrId } : { id: urlOrId },
      },
    ];
  }
  if (format === "DOCUMENT") {
    const urlOrId = normalizeMediaValue(values["headerDocumentUrl"] || "");
    if (!urlOrId) return [];
    const filename = values["headerDocumentFilename"]?.trim();
    return [
      {
        type: "document",
        document: isUrl(urlOrId)
          ? filename
            ? { link: urlOrId, filename }
            : { link: urlOrId }
          : { id: urlOrId },
      },
    ];
  }

  // TEXT header - use variable substitution
  return variables
    .filter((v) => v.component === "HEADER")
    .map((v) => ({
      type: "text",
      text: values[v.name] || "",
    }));
}

/**
 * Builds header parameters for a FIXED header using the stored media URL
 * (used when template.headerMode === "fixed" and template.headerMediaUrl is set).
 */
export function buildHeaderParamsFromStoredUrl(
  components: any[],
  storedUrl: string,
): any[] {
  const headerComp = Array.isArray(components)
    ? components.find((c: any) => c.type === "HEADER")
    : null;
  if (!headerComp || !storedUrl?.trim()) return [];

  const format = (headerComp.format || "TEXT").toUpperCase();
  const url = storedUrl.trim();
  const isUrl = /^https?:\/\//i.test(url);

  if (format === "IMAGE") {
    return [
      {
        type: "image",
        image: isUrl ? { link: url } : { id: url },
      },
    ];
  }
  if (format === "VIDEO") {
    return [
      {
        type: "video",
        video: isUrl ? { link: url } : { id: url },
      },
    ];
  }
  if (format === "DOCUMENT") {
    return [
      {
        type: "document",
        document: isUrl ? { link: url } : { id: url },
      },
    ];
  }
  return [];
}

/**
 * Formats variable values into the structure required by Meta's API.
 * Supports TEXT, IMAGE, VIDEO, and DOCUMENT header types.
 */
export function formatTemplateParameters(
  variables: TemplateVariable[],
  values: Record<string, string>,
  components?: any[],
) {
  // Meta expects parameters per component
  const bodyParams = variables
    .filter((v) => v.component === "BODY")
    .map((v) => ({
      type: "text",
      text: values[v.name] || "",
    }));

  const headerParams = components
    ? buildHeaderParams(components, variables, values)
    : variables
        .filter((v) => v.component === "HEADER")
        .map((v) => ({
          type: "text",
          text: values[v.name] || "",
        }));

  // Buttons are unique - they need sub_type and index
  const buttons = variables
    .filter((v) => v.component === "BUTTON")
    .reduce((acc: any[], v) => {
      const btnIndex = v.index ?? 0;
      let btn = acc.find((b) => b.index === btnIndex.toString());
      if (!btn) {
        btn = {
          type: "button",
          sub_type: "url",
          index: btnIndex.toString(),
          parameters: [],
        };
        acc.push(btn);
      }
      btn.parameters.push({
        type: "text",
        text: values[`btn_${btnIndex}_${v.name}`] || values[v.name] || "",
      });
      return acc;
    }, []);

  return {
    header: headerParams,
    body: bodyParams,
    buttons,
  };
}