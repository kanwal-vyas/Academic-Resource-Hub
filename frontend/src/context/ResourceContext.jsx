import React, { createContext, useContext, useState } from 'react';

const ResourceContext = createContext();

export const ResourceProvider = ({ children }) => {
  const [activeResource, setActiveResource] = useState(null);

  const setContextResource = (resource) => {
    setActiveResource(resource);
  };

  const clearContextResource = () => {
    setActiveResource(null);
  };

  return (
    <ResourceContext.Provider value={{ activeResource, setContextResource, clearContextResource }}>
      {children}
    </ResourceContext.Provider>
  );
};

export const useResourceContext = () => {
  const context = useContext(ResourceContext);
  if (!context) {
    throw new Error('useResourceContext must be used within a ResourceProvider');
  }
  return context;
};
