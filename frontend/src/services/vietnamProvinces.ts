const VIETNAM_PROVINCES_API =
  'https://raw.githubusercontent.com/kenzouno1/DiaGioiHanhChinhVN/master/data.json';

export type ProvincesMap = Record<string, Record<string, string[]>>;

interface RawWard {
  Name: string;
}

interface RawDistrict {
  Name: string;
  Wards?: RawWard[];
}

interface RawProvince {
  Name: string;
  Districts?: RawDistrict[];
}

export const fetchVietnamProvinces = async (): Promise<RawProvince[]> => {
  const response = await fetch(VIETNAM_PROVINCES_API);
  if (!response.ok) {
    throw new Error('Không thể tải dữ liệu địa giới hành chính');
  }
  return response.json() as Promise<RawProvince[]>;
};

export const formatProvincesData = (rawData: RawProvince[]): ProvincesMap => {
  if (!rawData || !Array.isArray(rawData)) return {};

  const formatted: ProvincesMap = {};

  rawData.forEach((province) => {
    const provinceName = province.Name;
    formatted[provinceName] = {};

    province.Districts?.forEach((district) => {
      const districtName = district.Name;
      formatted[provinceName][districtName] =
        district.Wards?.map((ward) => ward.Name) ?? [];
    });
  });

  return formatted;
};

export const getDistrictsByProvince = (
  provinces: ProvincesMap,
  provinceName: string,
): string[] => {
  if (!provinces[provinceName]) return [];
  return Object.keys(provinces[provinceName]);
};

export const getWardsByDistrict = (
  provinces: ProvincesMap,
  provinceName: string,
  districtName: string,
): string[] => {
  return provinces[provinceName]?.[districtName] ?? [];
};

export const validateAddress = (
  provinces: ProvincesMap,
  provinceName: string,
  districtName: string,
  wardName: string,
): { valid: boolean; message: string } => {
  if (!provinces[provinceName]) {
    return { valid: false, message: 'Tỉnh/thành phố không hợp lệ' };
  }
  if (!provinces[provinceName][districtName]) {
    return { valid: false, message: 'Quận/huyện không hợp lệ' };
  }
  if (!provinces[provinceName][districtName].includes(wardName)) {
    return { valid: false, message: 'Phường/xã không hợp lệ' };
  }
  return { valid: true, message: 'Địa chỉ hợp lệ' };
};
