import type { ComponentType } from 'react';

type RouteModule = Record<string, ComponentType>;

export async function lazyPage<T extends RouteModule>(
  importer: () => Promise<T>,
  exportName: keyof T & string,
) {
  const mod = await importer();
  return { Component: mod[exportName] as ComponentType };
}

export async function lazyAuthScreen<T extends RouteModule>(
  importer: () => Promise<T>,
  exportName: keyof T & string,
) {
  const [{ AuthLayout }, screenMod] = await Promise.all([
    import('@/components/layout/AuthLayout'),
    importer(),
  ]);

  const Screen = screenMod[exportName] as ComponentType;
  const Component = () => (
    <AuthLayout>
      <Screen />
    </AuthLayout>
  );

  return { Component };
}
