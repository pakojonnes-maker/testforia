// apps/client/src/components/reels/templates/TemplateFactory.tsx
import React from 'react';
import type { ReelConfig } from '../../../hooks/useReelsConfig';

// Importar templates
import ClassicTemplate from './classic/ClassicTemplate';
import PremiumTemplate from './premium/PremiumTemplate';
import MinimalTemplate from './minimal/MinimalTemplate';
import DynamicTemplate from './Dynamic/DynamicTemplate';

interface TemplateFactoryProps {
  template: string;
  config: ReelConfig;
  showUI: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

export const TemplateFactory: React.FC<TemplateFactoryProps> = ({
  template,
  config,
  showUI,
  onClose,
  children
}) => {
  // Determinar qué template usar
  const TemplateComponent = React.useMemo(() => {
    switch (template) {
      case 'tpl_classic':
        return ClassicTemplate;
      case 'tpl_premium':
        return PremiumTemplate;
      case 'tpl_minimal':
        return MinimalTemplate;
      case 'tpl_dynamic':
        return DynamicTemplate;
      default:
        console.warn(`Template '${template}' no encontrado, usando Classic`);
        return ClassicTemplate;
    }
  }, [template]);

  return (
    <TemplateComponent
      config={config}
      showUI={showUI}
      onClose={onClose}
    >
      {children}
    </TemplateComponent>
  );
};
