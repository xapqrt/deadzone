const { withAndroidManifest, withMainApplication } = require('@expo/config-plugins');

const withSimCardPermissions = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    // Add required permissions
    const permissions = [
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_PHONE_NUMBERS'
    ];

    permissions.forEach(permission => {
      const existing = androidManifest['uses-permission']?.find(
        p => p.$['android:name'] === permission
      );
      
      if (!existing) {
        if (!androidManifest['uses-permission']) {
          androidManifest['uses-permission'] = [];
        }
        androidManifest['uses-permission'].push({
          $: { 'android:name': permission }
        });
      }
    });

    return config;
  });
};

const withSimCardModule = (config) => {
  return withMainApplication(config, (config) => {
    const mainApplication = config.modResults;
    
    // Add import for SimCardPackage
    const importPattern = /import.*?;/g;
    const imports = mainApplication.match(importPattern) || [];
    const hasImport = imports.some(imp => imp.includes('SimCardPackage'));
    
    if (!hasImport) {
      const lastImport = imports[imports.length - 1];
      const importIndex = mainApplication.indexOf(lastImport) + lastImport.length;
      const newImport = '\nimport com.nozone.simcard.SimCardPackage;';
      mainApplication = mainApplication.slice(0, importIndex) + newImport + mainApplication.slice(importIndex);
    }
    
    // Add package to getPackages method
    const packagesPattern = /new ReactNativeHostProvider.*?getPackages.*?\{.*?return.*?\[(.*?)\]/gs;
    const match = packagesPattern.exec(mainApplication);
    
    if (match && !match[1].includes('SimCardPackage')) {
      const packages = match[1];
      const newPackages = packages.trim() ? packages + ',\n          new SimCardPackage()' : 'new SimCardPackage()';
      mainApplication = mainApplication.replace(
        match[0],
        match[0].replace(packages, newPackages)
      );
    }
    
    config.modResults = mainApplication;
    return config;
  });
};

const withSimCard = (config) => {
  config = withSimCardPermissions(config);
  config = withSimCardModule(config);
  return config;
};

module.exports = withSimCard;
