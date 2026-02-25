/**
 * Workbook creation service.
 * Creates branded Google Doc workbooks from source content + client brand config.
 */

import { JWT } from "google-auth-library";
import { google, docs_v1 } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENTS_DIR = path.join(__dirname, "..", "data", "clients");

export interface ClientConfig {
  name: string;
  provider: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    dark: string;
    muted: string;
    lightBg: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  images: {
    logo?: string;
    providerPhoto1?: string;
    providerPhoto2?: string;
  };
  stockImageFolder?: string;
  outputFolder?: string;
}

export interface WorkbookResult {
  docId: string;
  url: string;
  title: string;
  client: string;
  imagesInserted: number;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    red: parseInt(h.substring(0, 2), 16) / 255,
    green: parseInt(h.substring(2, 4), 16) / 255,
    blue: parseInt(h.substring(4, 6), 16) / 255,
  };
}

function imageUrl(fileId: string) {
  return `https://drive.google.com/uc?id=${fileId}`;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface DocElement {
  type: "paragraph" | "table";
  startIndex: number;
  endIndex: number;
  text: string;
  style?: string;
  isBullet?: boolean;
  rows?: Array<
    Array<{
      startIndex: number;
      endIndex: number;
      text: string;
      paragraphs: Array<{ startIndex: number; endIndex: number; text: string }>;
    }>
  >;
}

function readDocBody(
  bodyContent: docs_v1.Schema$StructuralElement[]
): DocElement[] {
  const elements: DocElement[] = [];
  for (const element of bodyContent) {
    if (element.paragraph) {
      const para = element.paragraph;
      let fullText = "";
      for (const el of para.elements || []) {
        if (el.textRun) fullText += el.textRun.content || "";
      }
      elements.push({
        type: "paragraph",
        startIndex: element.startIndex || 0,
        endIndex: element.endIndex || 0,
        text: fullText.trim(),
        style: para.paragraphStyle?.namedStyleType || "NORMAL_TEXT",
        isBullet: !!para.bullet,
      });
    }
    if (element.table) {
      const rows = [];
      for (const row of element.table.tableRows || []) {
        const cells = [];
        for (const cell of row.tableCells || []) {
          const cellParas: Array<{
            startIndex: number;
            endIndex: number;
            text: string;
          }> = [];
          let cellText = "";
          for (const content of cell.content || []) {
            if (content.paragraph) {
              let pText = "";
              for (const el of content.paragraph.elements || []) {
                if (el.textRun) pText += el.textRun.content || "";
              }
              cellParas.push({
                startIndex: content.startIndex || 0,
                endIndex: content.endIndex || 0,
                text: pText.trim(),
              });
              cellText += pText;
            }
          }
          cells.push({
            startIndex: cell.startIndex || 0,
            endIndex: cell.endIndex || 0,
            text: cellText.trim(),
            paragraphs: cellParas,
          });
        }
        rows.push(cells);
      }
      elements.push({
        type: "table",
        startIndex: element.startIndex || 0,
        endIndex: element.endIndex || 0,
        text: "",
        rows,
      });
    }
  }
  return elements;
}

/**
 * List available client configs.
 */
export function listClients(): Array<{ slug: string; name: string; provider: string }> {
  if (!fs.existsSync(CLIENTS_DIR)) return [];
  return fs
    .readdirSync(CLIENTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const config = JSON.parse(
        fs.readFileSync(path.join(CLIENTS_DIR, f), "utf-8")
      );
      return {
        slug: f.replace(".json", ""),
        name: config.name || f,
        provider: config.provider || "",
      };
    });
}

/**
 * Load a client config by slug.
 */
export function loadClientConfig(slug: string): ClientConfig | null {
  const configPath = path.join(CLIENTS_DIR, `${slug}.json`);
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

/**
 * Create a branded workbook from a source doc.
 */
export async function createWorkbook(
  clientSlug: string,
  sourceDocId: string,
  title?: string
): Promise<WorkbookResult> {
  const config = loadClientConfig(clientSlug);
  if (!config) throw new Error(`Client config not found: ${clientSlug}`);

  // Auth
  const saPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (!saPath) throw new Error("GOOGLE_SERVICE_ACCOUNT_PATH not set");
  const creds = JSON.parse(fs.readFileSync(saPath, "utf-8"));
  const subject = process.env.GOOGLE_IMPERSONATE_EMAIL || undefined;

  const jwtClient = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/documents",
    ],
    subject,
  });

  const driveApi = google.drive({ version: "v3", auth: jwtClient });
  const docsApi = google.docs({ version: "v1", auth: jwtClient });

  const COLORS = {
    primary: hexToRgb(config.colors.primary),
    secondary: hexToRgb(config.colors.secondary),
    accent: hexToRgb(config.colors.accent),
    dark: hexToRgb(config.colors.dark),
    muted: hexToRgb(config.colors.muted),
    lightBg: hexToRgb(config.colors.lightBg),
    white: { red: 1, green: 1, blue: 1 },
  };

  // Step 1: Copy the source doc
  const docTitle = title || `${config.name} — Branded Workbook`;
  const copy = await driveApi.files.copy({
    fileId: sourceDocId,
    requestBody: {
      name: docTitle,
      parents: config.outputFolder ? [config.outputFolder] : undefined,
    },
  });
  const newDocId = copy.data.id!;

  // Step 2: Read doc and delete PAGE markers + preamble
  const doc0 = await docsApi.documents.get({ documentId: newDocId });
  const elements0 = readDocBody(doc0.data.body?.content || []);

  const deleteRanges: Array<{ start: number; end: number }> = [];
  for (const el of elements0) {
    if (el.type === "paragraph" && /^PAGE \d+:/i.test(el.text)) {
      deleteRanges.push({ start: el.startIndex, end: el.endIndex });
    }
  }
  const firstMarker = elements0.find(
    (el) => el.type === "paragraph" && /^PAGE \d+:/i.test(el.text)
  );
  if (firstMarker && firstMarker.startIndex > 1) {
    deleteRanges.push({ start: 1, end: firstMarker.startIndex });
  }

  if (deleteRanges.length > 0) {
    deleteRanges.sort((a, b) => b.start - a.start);
    await docsApi.documents.batchUpdate({
      documentId: newDocId,
      requestBody: {
        requests: deleteRanges.map((r) => ({
          deleteContentRange: {
            range: { startIndex: r.start, endIndex: r.end },
          },
        })),
      },
    });
  }

  // Step 3: Update margins via typed API
  await docsApi.documents.batchUpdate({
    documentId: newDocId,
    requestBody: {
      requests: [
        {
          updateDocumentStyle: {
            documentStyle: {
              marginTop: { magnitude: 36, unit: "PT" },
              marginBottom: { magnitude: 36, unit: "PT" },
              marginLeft: { magnitude: 50, unit: "PT" },
              marginRight: { magnitude: 50, unit: "PT" },
            },
            fields: "marginTop,marginBottom,marginLeft,marginRight",
          },
        },
      ],
    },
  });

  // Named styles via raw fetch (googleapis client strips updateNamedStyle)
  const token = await jwtClient.getAccessToken();
  const namedStyles = [
    { namedStyleType: "HEADING_1", textStyle: { foregroundColor: { color: { rgbColor: COLORS.primary } }, bold: true, fontSize: { magnitude: 22, unit: "PT" }, weightedFontFamily: { fontFamily: config.fonts.heading } }, paragraphStyle: { spaceAbove: { magnitude: 6, unit: "PT" }, spaceBelow: { magnitude: 3, unit: "PT" } } },
    { namedStyleType: "HEADING_2", textStyle: { foregroundColor: { color: { rgbColor: COLORS.secondary } }, bold: true, fontSize: { magnitude: 14, unit: "PT" }, weightedFontFamily: { fontFamily: config.fonts.heading } }, paragraphStyle: { spaceAbove: { magnitude: 6, unit: "PT" }, spaceBelow: { magnitude: 2, unit: "PT" } } },
    { namedStyleType: "HEADING_3", textStyle: { foregroundColor: { color: { rgbColor: COLORS.primary } }, bold: true, fontSize: { magnitude: 11, unit: "PT" }, weightedFontFamily: { fontFamily: config.fonts.heading } }, paragraphStyle: { spaceAbove: { magnitude: 4, unit: "PT" }, spaceBelow: { magnitude: 1, unit: "PT" } } },
    { namedStyleType: "NORMAL_TEXT", textStyle: { foregroundColor: { color: { rgbColor: COLORS.dark } }, fontSize: { magnitude: 10, unit: "PT" }, weightedFontFamily: { fontFamily: config.fonts.body } }, paragraphStyle: { spaceAbove: { magnitude: 1, unit: "PT" }, spaceBelow: { magnitude: 1, unit: "PT" }, lineSpacing: 115 } },
  ];
  const nsFields: Record<string, string> = {
    "HEADING_1": "textStyle.foregroundColor,textStyle.bold,textStyle.fontSize,textStyle.weightedFontFamily,paragraphStyle.spaceAbove,paragraphStyle.spaceBelow",
    "HEADING_2": "textStyle.foregroundColor,textStyle.bold,textStyle.fontSize,textStyle.weightedFontFamily,paragraphStyle.spaceAbove,paragraphStyle.spaceBelow",
    "HEADING_3": "textStyle.foregroundColor,textStyle.bold,textStyle.fontSize,textStyle.weightedFontFamily,paragraphStyle.spaceAbove,paragraphStyle.spaceBelow",
    "NORMAL_TEXT": "textStyle.foregroundColor,textStyle.fontSize,textStyle.weightedFontFamily,paragraphStyle.spaceAbove,paragraphStyle.spaceBelow,paragraphStyle.lineSpacing",
  };
  await fetch(`https://docs.googleapis.com/v1/documents/${newDocId}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: namedStyles.map((ns) => ({
        updateNamedStyle: { namedStyle: ns, fields: nsFields[ns.namedStyleType] },
      })),
    }),
  });

  // Step 4: Re-read doc, style tables + cover page
  await delay(1000);
  const doc1 = await docsApi.documents.get({ documentId: newDocId });
  const elements1 = readDocBody(doc1.data.body?.content || []);
  const paras1 = elements1.filter((e) => e.type === "paragraph");
  const tables1 = elements1.filter((e) => e.type === "table");

  const requests: docs_v1.Schema$Request[] = [];

  // Table styling
  for (const table of tables1) {
    if (!table.rows) continue;
    for (let r = 0; r < table.rows.length; r++) {
      const row = table.rows[r];
      const isHeader = r === 0;
      for (const cell of row) {
        for (const cp of cell.paragraphs) {
          if (cp.endIndex <= cp.startIndex) continue;
          if (isHeader) {
            requests.push({
              updateTextStyle: {
                range: { startIndex: cp.startIndex, endIndex: cp.endIndex },
                textStyle: {
                  foregroundColor: { color: { rgbColor: COLORS.white } },
                  bold: true,
                  fontSize: { magnitude: 9, unit: "PT" },
                  weightedFontFamily: { fontFamily: config.fonts.heading },
                },
                fields: "foregroundColor,bold,fontSize,weightedFontFamily",
              },
            });
            requests.push({
              updateParagraphStyle: {
                range: { startIndex: cp.startIndex, endIndex: cp.endIndex },
                paragraphStyle: {
                  shading: {
                    backgroundColor: { color: { rgbColor: COLORS.primary } },
                  },
                },
                fields: "shading",
              },
            });
          } else {
            requests.push({
              updateTextStyle: {
                range: { startIndex: cp.startIndex, endIndex: cp.endIndex },
                textStyle: {
                  fontSize: { magnitude: 9, unit: "PT" },
                  weightedFontFamily: { fontFamily: config.fonts.body },
                },
                fields: "fontSize,weightedFontFamily",
              },
            });
            if (r % 2 === 0) {
              requests.push({
                updateParagraphStyle: {
                  range: { startIndex: cp.startIndex, endIndex: cp.endIndex },
                  paragraphStyle: {
                    shading: {
                      backgroundColor: { color: { rgbColor: COLORS.lightBg } },
                    },
                  },
                  fields: "shading",
                },
              });
            }
          }
        }
      }
    }
  }

  // Cover page styling
  const coverTitle = paras1.find(
    (p) => p.style === "HEADING_1" && p.startIndex < 100
  );
  if (coverTitle) {
    requests.push({
      updateTextStyle: {
        range: {
          startIndex: coverTitle.startIndex,
          endIndex: coverTitle.endIndex,
        },
        textStyle: { fontSize: { magnitude: 26, unit: "PT" } },
        fields: "fontSize",
      },
    });
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: coverTitle.startIndex,
          endIndex: coverTitle.endIndex,
        },
        paragraphStyle: {
          alignment: "CENTER",
          spaceAbove: { magnitude: 60, unit: "PT" },
        },
        fields: "alignment,spaceAbove",
      },
    });
  }

  const subtitle = paras1.find(
    (p) => p.style === "HEADING_2" && p.startIndex < 200
  );
  if (subtitle) {
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: subtitle.startIndex, endIndex: subtitle.endIndex },
        paragraphStyle: { alignment: "CENTER" },
        fields: "alignment",
      },
    });
  }

  // Center cover page text + style quotes/disclaimers
  const firstH2 = paras1.find(
    (p) => p.style === "HEADING_2" && p.startIndex > 200
  );
  const coverEnd = firstH2 ? firstH2.startIndex : 500;
  for (const p of paras1) {
    if (
      p.startIndex > 0 &&
      p.startIndex < coverEnd &&
      p.style === "NORMAL_TEXT"
    ) {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: p.startIndex, endIndex: p.endIndex },
          paragraphStyle: { alignment: "CENTER" },
          fields: "alignment",
        },
      });
      if (p.text.startsWith('"') && p.text.endsWith('"')) {
        requests.push({
          updateTextStyle: {
            range: { startIndex: p.startIndex, endIndex: p.endIndex },
            textStyle: {
              italic: true,
              foregroundColor: { color: { rgbColor: COLORS.primary } },
            },
            fields: "italic,foregroundColor",
          },
        });
      }
      if (
        p.text.includes("educational purposes only") ||
        p.text.includes("does not replace")
      ) {
        requests.push({
          updateTextStyle: {
            range: { startIndex: p.startIndex, endIndex: p.endIndex },
            textStyle: {
              foregroundColor: { color: { rgbColor: COLORS.muted } },
              fontSize: { magnitude: 7.5, unit: "PT" },
              italic: true,
            },
            fields: "foregroundColor,fontSize,italic",
          },
        });
      }
    }
  }

  // Apply in batches
  if (requests.length > 0) {
    for (let i = 0; i < requests.length; i += 80) {
      const chunk = requests.slice(i, i + 80);
      await docsApi.documents.batchUpdate({
        documentId: newDocId,
        requestBody: { requests: chunk },
      });
      if (i + 80 < requests.length) await delay(2000);
    }
  }

  // Step 5: Insert images
  let imagesInserted = 0;
  const imagesToInsert: Array<{
    after: string;
    fileId: string;
    width: number;
    height: number;
  }> = [];

  if (config.images.logo && subtitle) {
    imagesToInsert.push({
      after: subtitle.text,
      fileId: config.images.logo,
      width: 150,
      height: 150,
    });
  }
  if (config.images.providerPhoto1) {
    const welcomeH2 = paras1.find(
      (p) => p.style === "HEADING_2" && p.startIndex > 200
    );
    if (welcomeH2) {
      imagesToInsert.push({
        after: welcomeH2.text,
        fileId: config.images.providerPhoto1,
        width: 160,
        height: 240,
      });
    }
  }
  if (config.images.providerPhoto2) {
    const lastThird = (paras1[paras1.length - 1]?.endIndex || 0) * 0.7;
    const lateH2 = paras1.find(
      (p) => p.style === "HEADING_2" && p.startIndex > lastThird
    );
    if (lateH2) {
      imagesToInsert.push({
        after: lateH2.text,
        fileId: config.images.providerPhoto2,
        width: 160,
        height: 107,
      });
    }
  }

  if (imagesToInsert.length > 0) {
    await delay(2000);
    const doc2 = await docsApi.documents.get({ documentId: newDocId });
    const paras2 = readDocBody(doc2.data.body?.content || []).filter(
      (e) => e.type === "paragraph"
    );

    const resolved = imagesToInsert
      .map((img) => {
        const p = paras2.find((pp) => pp.text.includes(img.after));
        return p ? { ...img, position: p.endIndex - 1 } : null;
      })
      .filter(Boolean) as Array<{
      after: string;
      fileId: string;
      width: number;
      height: number;
      position: number;
    }>;

    resolved.sort((a, b) => b.position - a.position);

    const imgReqs = resolved.map((img) => ({
      insertInlineImage: {
        location: { index: img.position },
        uri: imageUrl(img.fileId),
        objectSize: {
          width: { magnitude: img.width, unit: "PT" },
          height: { magnitude: img.height, unit: "PT" },
        },
      },
    }));

    try {
      await docsApi.documents.batchUpdate({
        documentId: newDocId,
        requestBody: { requests: imgReqs },
      });
      imagesInserted = imgReqs.length;
    } catch {
      // Try one at a time
      for (const req of imgReqs) {
        try {
          await delay(1500);
          await docsApi.documents.batchUpdate({
            documentId: newDocId,
            requestBody: { requests: [req] },
          });
          imagesInserted++;
        } catch {
          // skip failed image
        }
      }
    }
  }

  return {
    docId: newDocId,
    url: `https://docs.google.com/document/d/${newDocId}/edit`,
    title: docTitle,
    client: config.name,
    imagesInserted,
  };
}
