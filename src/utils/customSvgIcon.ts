export const MAX_CUSTOM_SVG_BYTES = 8192;

export type SvgIconValidationCode =
  | 'invalid-file-type'
  | 'invalid-svg'
  | 'svg-too-large';

export class SvgIconValidationError extends Error {
  constructor(public readonly code: SvgIconValidationCode) {
    super(code);
  }
}

function removeUnsafeSvgContent(svg: SVGSVGElement): void {
  svg
    .querySelectorAll(
      'script, style, foreignObject, iframe, object, embed, image, audio, video, use',
    )
    .forEach((element) => element.remove());

  const elements = [svg, ...Array.from(svg.querySelectorAll('*'))];
  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      const hasExternalUrl = /url\s*\(/i.test(value) && !/url\s*\(\s*#/.test(value);
      if (
        name.startsWith('on') ||
        name === 'style' ||
        name === 'href' ||
        name === 'xlink:href' ||
        hasExternalUrl ||
        value.startsWith('javascript:')
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }
}

export function sanitizeCustomSvg(source: string): string {
  const documentNode = new DOMParser().parseFromString(
    source,
    'image/svg+xml',
  );
  if (
    documentNode.querySelector('parsererror') ||
    documentNode.documentElement.localName.toLowerCase() !== 'svg'
  ) {
    throw new SvgIconValidationError('invalid-svg');
  }

  const svg = documentNode.documentElement as unknown as SVGSVGElement;
  removeUnsafeSvgContent(svg);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const serialized = new XMLSerializer().serializeToString(svg);
  if (new TextEncoder().encode(serialized).length > MAX_CUSTOM_SVG_BYTES) {
    throw new SvgIconValidationError('svg-too-large');
  }
  return serialized;
}

export function readCustomSvgFile(file: File): Promise<string> {
  if (
    !file.name.toLowerCase().endsWith('.svg') ||
    (file.type !== '' && file.type !== 'image/svg+xml')
  ) {
    return Promise.reject(new SvgIconValidationError('invalid-file-type'));
  }
  return file.text().then(sanitizeCustomSvg);
}

const svgDataUrlCache = new Map<string, string>();

export function svgSourceToDataUrl(svg: string): string {
  const cached = svgDataUrlCache.get(svg);
  if (cached) return cached;
  try {
    const sanitized = sanitizeCustomSvg(svg);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized)}`;
    if (svgDataUrlCache.size >= 50) {
      const oldestKey = svgDataUrlCache.keys().next().value;
      if (oldestKey !== undefined) svgDataUrlCache.delete(oldestKey);
    }
    svgDataUrlCache.set(svg, dataUrl);
    return dataUrl;
  } catch {
    return '';
  }
}
