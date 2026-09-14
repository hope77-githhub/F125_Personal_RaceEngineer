import ctypes
from .header import PacketHeader

class MarshalZone(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_zoneStart", ctypes.c_float),
        ("m_zoneFlag", ctypes.c_int8),
    ]

class WeatherForecastSample(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_sessionType", ctypes.c_uint8),
        ("m_timeOffset", ctypes.c_uint8),
        ("m_weather", ctypes.c_uint8),
        ("m_trackTemperature", ctypes.c_int8),
        ("m_trackTemperatureChange", ctypes.c_int8),
        ("m_airTemperature", ctypes.c_int8),
        ("m_airTemperatureChange", ctypes.c_int8),
        ("m_rainPercentage", ctypes.c_uint8),
    ]

class ActiveAeroZone(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_zoneStart", ctypes.c_float),
        ("m_zoneEnd", ctypes.c_float),
    ]

class DRSZone(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_zoneStart", ctypes.c_float),
        ("m_zoneEnd", ctypes.c_float),
    ]

class PacketSessionData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_header", PacketHeader),
        ("m_weather", ctypes.c_uint8),
        ("m_trackTemperature", ctypes.c_int8),
        ("m_airTemperature", ctypes.c_int8),
        ("m_totalLaps", ctypes.c_uint8),
        ("m_trackLength", ctypes.c_uint16),
        ("m_sessionType", ctypes.c_uint8),
        ("m_trackId", ctypes.c_int8),
        ("m_formula", ctypes.c_uint8),
        ("m_sessionTimeLeft", ctypes.c_uint16),
        ("m_sessionDuration", ctypes.c_uint16),
        ("m_pitSpeedLimit", ctypes.c_uint8),
        ("m_gamePaused", ctypes.c_uint8),
        ("m_isSpectating", ctypes.c_uint8),
        ("m_spectatorCarIndex", ctypes.c_uint8),
        ("m_sliProNativeSupport", ctypes.c_uint8),
        ("m_numMarshalZones", ctypes.c_uint8),
        ("m_marshalZones", MarshalZone * 21),
        ("m_safetyCarStatus", ctypes.c_uint8),
        ("m_networkGame", ctypes.c_uint8),
        ("m_numWeatherForecastSamples", ctypes.c_uint8),
        ("m_weatherForecastSamples", WeatherForecastSample * 64),
        ("m_forecastAccuracy", ctypes.c_uint8),
        ("m_aiDifficulty", ctypes.c_uint8),
        ("m_seasonLinkIdentifier", ctypes.c_uint32),
        ("m_weekendLinkIdentifier", ctypes.c_uint32),
        ("m_sessionLinkIdentifier", ctypes.c_uint32),
        ("m_pitStopWindowIdealLap", ctypes.c_uint8),
        ("m_pitStopWindowLatestLap", ctypes.c_uint8),
        ("m_pitStopRejoinPosition", ctypes.c_uint8),
        ("m_steeringAssist", ctypes.c_uint8),
        ("m_brakingAssist", ctypes.c_uint8),
        ("m_gearboxAssist", ctypes.c_uint8),
        ("m_pitAssist", ctypes.c_uint8),
        ("m_pitReleaseAssist", ctypes.c_uint8),
        ("m_ERSAssist", ctypes.c_uint8),
        ("m_DRSAssist", ctypes.c_uint8),
        ("m_dynamicRacingLine", ctypes.c_uint8),
        ("m_dynamicRacingLineType", ctypes.c_uint8),
        ("m_gameMode", ctypes.c_uint8),
        ("m_ruleSet", ctypes.c_uint8),
        ("m_timeOfDay", ctypes.c_uint32),
        ("m_sessionLength", ctypes.c_uint8),
        ("m_speedUnitsLeadPlayer", ctypes.c_uint8),
        ("m_temperatureUnitsLeadPlayer", ctypes.c_uint8),
        ("m_speedUnitsSecondaryPlayer", ctypes.c_uint8),
        ("m_temperatureUnitsSecondaryPlayer", ctypes.c_uint8),
        ("m_numSafetyCarPeriods", ctypes.c_uint8),
        ("m_numVirtualSafetyCarPeriods", ctypes.c_uint8),
        ("m_numRedFlagPeriods", ctypes.c_uint8),
        ("m_equalCarPerformance", ctypes.c_uint8),
        ("m_recoveryMode", ctypes.c_uint8),
        ("m_flashbackLimit", ctypes.c_uint8),
        ("m_surfaceType", ctypes.c_uint8),
        ("m_lowFuelMode", ctypes.c_uint8),
        ("m_raceStarts", ctypes.c_uint8),
        ("m_tyreTemperature", ctypes.c_uint8),
        ("m_pitLaneTyreSim", ctypes.c_uint8),
        ("m_carDamage", ctypes.c_uint8),
        ("m_carDamageRate", ctypes.c_uint8),
        ("m_collisions", ctypes.c_uint8),
        ("m_collisionsOffForFirstLapOnly", ctypes.c_uint8),
        ("m_mpUnsafePitRelease", ctypes.c_uint8),
        ("m_mpOffForGriefing", ctypes.c_uint8),
        ("m_cornerCuttingStringency", ctypes.c_uint8),
        ("m_parcFermeRules", ctypes.c_uint8),
        ("m_pitStopExperience", ctypes.c_uint8),
        ("m_safetyCar", ctypes.c_uint8),
        ("m_safetyCarExperience", ctypes.c_uint8),
        ("m_formationLap", ctypes.c_uint8),
        ("m_formationLapExperience", ctypes.c_uint8),
        ("m_redFlags", ctypes.c_uint8),
        ("m_affectsLicenceLevelSolo", ctypes.c_uint8),
        ("m_affectsLicenceLevelMP", ctypes.c_uint8),
        ("m_numSessionsInWeekend", ctypes.c_uint8),
        ("m_weekendStructure", ctypes.c_uint8 * 12),
        ("m_sector2LapDistanceStart", ctypes.c_float),
        ("m_sector3LapDistanceStart", ctypes.c_float),
        ("m_activeAeroTrackStatus", ctypes.c_uint8),
        ("m_numActiveAeroZonesFull", ctypes.c_uint8),
        ("m_activeAeroZonesFull", ActiveAeroZone * 8),
        ("m_numActiveAeroZonesPartial", ctypes.c_uint8),
        ("m_activeAeroZonesPartial", ActiveAeroZone * 8),
        ("m_numDRSZones", ctypes.c_uint8),
        ("m_drsZones", DRSZone * 4),
        ("m_startReactionTime", ctypes.c_float),
        ("m_antiLockBrakesAssist", ctypes.c_uint8),
        ("m_tractionControlAssist", ctypes.c_uint8),
        ("m_dynamicRacingLineHiVis", ctypes.c_uint8),
        ("m_dynamicRacingLineColourBlind", ctypes.c_uint8),
        ("m_recurringRewindPrompt", ctypes.c_uint8),
    ]
