class FingerprintService {
    constructor() {
        this.deviceProfiles = {
            android: {
                brands: ['HUAWEI', 'HONOR', 'OPPO', 'vivo', 'Xiaomi', 'SAMSUNG', 'OnePlus'],
                models: {
                    'HUAWEI': ['P40', 'P30', 'Mate 30', 'Nova 7'],
                    'HONOR': ['V30', 'X10', '30', '20'],
                    'OPPO': ['Reno6', 'Find X3', 'A93', 'R17'],
                    'vivo': ['X60', 'Y73', 'V21', 'S9'],
                    'Xiaomi': ['Mi 11', 'Redmi K40', 'POCO F3', 'Note 10'],
                    'SAMSUNG': ['Galaxy S21', 'A52', 'M32', 'F62'],
                    'OnePlus': ['9 Pro', '8T', 'Nord', '7T']
                },
                osVersions: ['10', '11', '12', '13'],
                screenResolutions: [
                    '1080x2400', '1440x3200', '1080x2340', '1440x3088'
                ]
            },
            ios: {
                models: ['iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15'],
                versions: ['14.0', '15.0', '16.0', '17.0'],
                screenResolutions: [
                    '1170x2532', '1284x2778', '1125x2436'
                ]
            }
        }
    }

    generateDeviceProfile() {
        const platform = Math.random() > 0.5 ? 'android' : 'ios';
        
        if (platform === 'android') {
            const brand = this._randomElement(this.deviceProfiles.android.brands);
            const model = this._randomElement(this.deviceProfiles.android.models[brand]);
            const osVersion = this._randomElement(this.deviceProfiles.android.osVersions);
            const resolution = this._randomElement(this.deviceProfiles.android.screenResolutions);

            return {
                platform,
                brand,
                model,
                osVersion,
                resolution,
                userAgent: this._generateAndroidUA(brand, model, osVersion),
                fingerprint: this._generateDeviceFingerprint(platform, brand, model)
            };
        } else {
            const model = this._randomElement(this.deviceProfiles.ios.models);
            const version = this._randomElement(this.deviceProfiles.ios.versions);
            const resolution = this._randomElement(this.deviceProfiles.ios.screenResolutions);

            return {
                platform,
                model,
                version,
                resolution,
                userAgent: this._generateIosUA(model, version),
                fingerprint: this._generateDeviceFingerprint(platform, 'Apple', model)
            };
        }
    }

    _generateAndroidUA(brand, model, osVersion) {
        return `Mozilla/5.0 (Linux; Android ${osVersion}; ${brand} ${model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this._randomChromeMajorVersion()} Mobile Safari/537.36`;
    }

    _generateIosUA(model, version) {
        return `Mozilla/5.0 (${model}; CPU iPhone OS ${version.replace('.', '_')} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Mobile/15E148 Safari/604.1`;
    }

    _generateDeviceFingerprint(platform, brand, model) {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substr(2, 8);
        return `${platform}_${brand}_${model}_${timestamp}_${randomStr}`;
    }

    _randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    _randomChromeMajorVersion() {
        return Math.floor(Math.random() * (108 - 95) + 95);
    }
}

export default new FingerprintService(); 