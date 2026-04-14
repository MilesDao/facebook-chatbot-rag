from pydantic import BaseModel
from backend.database import supabase

class AppSetting(BaseModel):
    setting_key: str
    setting_value: str

class SettingsService:
    @staticmethod
    def get_setting(setting_key: str) -> str | None:
        try:
            response = supabase.table('app_settings').select('setting_value').eq('setting_key', setting_key).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]['setting_value']
            return None
        except Exception as e:
            print(f"Error fetching setting {setting_key}: {e}")
            return None

    @staticmethod
    def set_setting(setting: AppSetting) -> str | None:
        try:
            # Upsert the setting
            response = supabase.table('app_settings').upsert(
                {
                    'setting_key': setting.setting_key, 
                    'setting_value': setting.setting_value
                },
                on_conflict='setting_key'
            ).execute()
            
            # Since upsert returns the data
            if response.data:
                return response.data[0]['setting_value']
            return None
        except Exception as e:
            print(f"Error setting {setting.setting_key}: {e}")
            return None
