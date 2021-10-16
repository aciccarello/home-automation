// @see https://github.com/konsumer/tplink-lightbulb
declare module "tplink-lightbulb" {
  import { EventEmitter } from "events";

  export type TPLResponse<T> = Promise<
    T & {
      err_code;
    }
  >;
  export interface Device {
    ip: string;
    _info: {};
    _sysinfo: {};
    host: string;
    port: number;
    name: string;
    deviceId: string;
  }

  export interface HSBC {
    hue: number;
    saturation: number;
    color_temp: number;
    brightness: number;
  }

  export interface LightState extends HSBC {
    on_off: 0 | 1;
    mode: string;
  }

  export interface DeviceInfo {
    sw_ver: string;
    hw_ver: string;
    model: string;
    deviceId: string;
    oemId: string;
    hwId: string;
    rssi: number;
    latitude_i: number;
    longitude_i: number;
    alias: string;
    status: string;
    description: string;
    mic_type: string;
    mic_mac: string;
    dev_state: string;
    is_factory: false;
    disco_ver: string;
    ctrl_protocols: { name: string; version: string };
    active_mode: string;
    is_dimmable: number;
    is_color: number;
    is_variable_color_temp: number;
    light_state: LightState & {
      dft_on_state?: Omit<LightState, "on_off">;
    };
    preferred_state: (HSBC & {
      index: number;
    })[];
  }

  export interface DeviceDetails extends DeviceInfo {
    "smartlife.iot.smartbulb.lightingservice": {
      get_light_details: {
        lamp_beam_angle: number;
        min_voltage: number;
        max_voltage: number;
        wattage: number;
        incandescent_equivalent: number;
        max_lumens: number;
        color_rendering_index: number;
        err_code: number;
      };
    };
  }

  export class TPLSmartDevice {
    constructor(public ip?: string);
    /**
     * Look for devices
     *
     * @param filter Only return devices with this class, (ie 'IOT.SMARTBULB')
     * @param broadcast  Use this broadcast IP. Default is '255.255.255.255'
     * @return Event emitter with stop method
     */
    static scan(
      filter?: string,
      broadcast = "255.255.255.255"
    ): EventEmitter & { stop: () => void };

    setState(): Promise;
    listwifi(): Promise<
      {
        ssid: string;
        key_type: number;
        cipher_type: number;
        bssid: string;
        channel: string;
        rssi: number;
      }[]
    >;
    connectwifi(
      ssid: string,
      password: string,
      keyType: number,
      cypherType: number
    ): Promise;
    info(): TPLResponse<DeviceInfo>;
    send(msg: any): Promise;
    power(
      powerState: boolean,
      transition: number,
      options?: {
        mode: string;
        hue: number;
        saturation: number;
        color_temp: number;
        brightness: number;
      }
    ): TPLResponse<LightState>;
    led(state: boolean): Promise;
    name(newAlias: string): Promise;
    /**
     * Get schedule info
     * @param   {number}   month  Month to check: 1-12
     * @param   {number}   year   Full year to check: ie 2017
     *
     * @return  {Promise}         Schedule info
     */
    daystate(month: number, year: number): Promise;
    cloud(): Promise;
    schedule(): Promise;
    details(): Promise<DeviceDetails>;
    reboot(): Promise;

    /**
     * Badly encrypt message in format bulbs use
     *
     * @param   {Buffer}   buffer  Buffer data to encrypt
     * @param   {number}   key     Encryption key (default is generally correct)
     *
     * @return  {Promise}          Encrypted data
     */
    encrypt(buffer: Buffer, key: number): Promise;

    /**
     * Badly decrypt message in format bulbs use
     *
     * @param   {Buffer}   buffer  Buffer data to decrypt
     * @param   {number}   key     Encryption key (default is generally correct)
     *
     * @return  {Promise}          Decrypted data
     */
    decrypt(buffer: Buffer, key: number): Promise;
  }
  export = TPLSmartDevice;
}

// import TPLSmartDevice from "tplink-lightbulb";
