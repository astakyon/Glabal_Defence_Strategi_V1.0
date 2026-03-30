import countryData from '../assets/country_data.json';
import { CountryMetadata } from '../types';

const STORAGE_KEY = 'countryMetadata';
const VERSION_KEY = 'countryMetadataVersion';
const CURRENT_VERSION = 1;

export const DataManager = {
  getInitializedData(): CountryMetadata {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const savedVersion = localStorage.getItem(VERSION_KEY);

    // 1. Statik veriyi kopyala (numericId ekleyerek)
    const baseData = { ...countryData } as CountryMetadata;
    Object.keys(baseData).forEach((key, index) => {
      baseData[key].numericId = index + 1;
    });

    if (!savedData) {
      return baseData;
    }

    try {
      const parsedData = JSON.parse(savedData) as CountryMetadata;

      // 2. Versiyon kontrolü ve basit migration
      if (!savedVersion || Number(savedVersion) < CURRENT_VERSION) {
        // Burada gelecekteki veri yapısı değişiklikleri için migration kodları olacak
      }

      // 3. Statik veri ile birleştir (Merge)
      // Kullanıcının yaptığı değişiklikleri statik verinin üzerine yaz
      const mergedData = { ...baseData };
      Object.keys(parsedData).forEach((key) => {
        if (mergedData[key]) {
          mergedData[key] = { ...mergedData[key], ...parsedData[key] };
        }
      });

      return mergedData;
    } catch (error) {
      console.error("Veri yüklenirken hata oluştu, varsayılanlar kullanılıyor:", error);
      return baseData;
    }
  },

  saveData(data: CountryMetadata) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
  }
};
