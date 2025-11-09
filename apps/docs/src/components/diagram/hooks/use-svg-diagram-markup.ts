import { useEffect, useId, useMemo, useState } from 'react';
import { type DiagramParamsBase } from '../types';
import { CLIENT_ENV } from '@/env';

export const useSvgDiagramMarkup = ({ lang, path, chart }: DiagramParamsBase) => {
  const id = useId();
  const [svg, setSvg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const krokiApiUrl = useMemo(() => {
    // Mermaid завжди рендериться локально (і inline chart, і з файлу)
    if (lang === 'mermaid') return '';

    const baseUrl = CLIENT_ENV().NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const url = new URL('/api/diagram', baseUrl);

    if (!path || path === '') {
      throw new Error('path is required');
    }

    url.searchParams.set('lang', lang);
    url.searchParams.set('path', path);

    return url.toString();
  }, [lang, path, chart]);

  useEffect(() => {
    if (krokiApiUrl === '') return;
    
    const fetchSvg = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(krokiApiUrl);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Diagram fetch failed:', res.status, errorText);
          setSvg(`<div style="color: red; padding: 20px;">Error loading diagram: ${res.status}</div>`);
          setIsLoading(false);
          return;
        }

        const response = await res.text();
        setSvg(response);
        setIsLoading(false);
      } catch (error) {
        console.error('Error while fetching diagram:', error);
        setSvg(`<div style="color: red; padding: 20px;">Error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`);
        setIsLoading(false);
      }
    };

    fetchSvg();
  }, [krokiApiUrl]);

  useEffect(() => {
    if (lang !== 'mermaid') return;
    if (!chart && !path) return;

    const renderChart = async () => {
      const { default: mermaid } = await import('mermaid');

      try {
        setIsLoading(true);
        
        // Якщо є path, завантажуємо файл
        let mermaidCode = chart || '';
        if (path && !chart) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/diagram?lang=text&path=${encodeURIComponent(path)}`);
          if (!response.ok) {
            throw new Error(`Failed to load mermaid file: ${response.status}`);
          }
          mermaidCode = await response.text();
        }
        
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          fontFamily: 'inherit',
          theme: 'default',
          themeCSS: `
            .edgeLabel { color: #000 !important; fill: #000 !important; }
            .edgeLabel rect { fill: #fff !important; }
            .label { color: #000 !important; fill: #000 !important; }
            text { fill: #000 !important; }
            .messageText { fill: #000 !important; stroke: none !important; }
            .labelText { fill: #000 !important; }
            .loopText { fill: #000 !important; }
            .loopLine { stroke: #000 !important; }
            .actor { fill: #fff !important; stroke: #000 !important; }
            .activation0, .activation1, .activation2 { fill: #f4f4f4 !important; stroke: #666 !important; }
          `,
        });

        const { svg: mermaidSvg } = await mermaid.render(id, mermaidCode.replaceAll('\\n', '\n'));

        // Додаємо стилі для посилань після рендерингу
        const styledSvg = mermaidSvg.replace(
          '</style>',
          `
          a, a *, a text, a tspan { fill: #0366d6 !important; color: #0366d6 !important; }
          .label a, .label a * { fill: #0366d6 !important; }
          .nodeLabel a, .nodeLabel a * { fill: #0366d6 !important; }
          foreignObject a { color: #0366d6 !important; }
          </style>`
        );

        setSvg(styledSvg);
        setIsLoading(false);
      } catch (error) {
        console.error('Error while rendering mermaid', error);
        setSvg(`<div style="color: red; padding: 20px;">Error rendering mermaid: ${error instanceof Error ? error.message : 'Unknown error'}</div>`);
        setIsLoading(false);
      }
    };

    renderChart().catch(() => {
      console.error('Error while rendering mermaid');
    });
  }, [chart, id, lang, path]);

  return { svg, isLoading };
};
