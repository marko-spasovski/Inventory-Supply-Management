declare module 'authMf/App' {
  import { AuthUser } from './auth';
  interface Props { onLogin: (user: AuthUser) => void; }
  const App: React.ComponentType<Props>;
  export default App;
}

declare module 'warehousesMf/App' {
  const App: React.ComponentType;
  export default App;
}

declare module 'inventoryMf/App' {
  const App: React.ComponentType;
  export default App;
}

declare module 'ordersMf/App' {
  const App: React.ComponentType;
  export default App;
}

declare module 'companiesMf/App' {
  const App: React.ComponentType;
  export default App;
}

declare module 'fleetMf/App' {
  const App: React.ComponentType;
  export default App;
}

declare module 'productsMf/App' {
  const App: React.ComponentType;
  export default App;
}
