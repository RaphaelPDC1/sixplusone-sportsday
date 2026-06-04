with open('server/_core/klaviyo.ts', 'r') as f:
    lines = f.readlines()

# Find and replace the function
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if 'export async function upsertKlaviyoProfile' in line:
        start_idx = i - 3  # Include the comment
    if start_idx is not None and i > start_idx and line.strip() == '}' and 'catch' in ''.join(lines[max(0, i-10):i]):
        end_idx = i + 1
        break

if start_idx is not None and end_idx is not None:
    new_func = '''/**
 * Create or update a Klaviyo profile
 * Uses email as unique identifier
 * Tries POST first (new profile), falls back to PATCH if profile exists
 */
export async function upsertKlaviyoProfile(
  email: string,
  properties: Record<string, any>
): Promise<boolean> {
  try {
    const payload = {
      data: {
        type: "profile",
        attributes: {
          email,
          properties,
        },
      },
    };
    // Try POST first (for new profiles)
    let result = await makeKlaviyoRequest("POST", "/profiles", payload);
    
    // If POST failed (likely 409 conflict), try to fetch and PATCH
    if (!result) {
      console.log(`[Klaviyo] Profile likely exists, attempting PATCH update...`);
      
      try {
        // Fetch existing profile by email
        const filterStr = encodeURIComponent(`equals(email,"${email}")`);
        const fetchUrl = `https://a.klaviyo.com/api/profiles?filter=${filterStr}`;
        const fetchResponse = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Klaviyo-API-Key ${ENV.KLAVIYO_API_KEY}`,
            'revision': '2024-10-15',
          },
        });
        
        const fetchData = await fetchResponse.json();
        if (fetchData.data && fetchData.data.length > 0) {
          const profileId = fetchData.data[0].id;
          
          // Update via PATCH
          const patchPayload = {
            data: {
              type: "profile",
              id: profileId,
              attributes: {
                properties,
              },
            },
          };
          
          result = await makeKlaviyoRequest("PATCH", `/profiles/${profileId}`, patchPayload);
          if (!result) {
            console.warn(`[Klaviyo] Profile PATCH failed for ${email}`);
            return false;
          }
          
          console.log(`[Klaviyo] Profile updated via PATCH for ${email}`);
          return true;
        }
      } catch (patchErr) {
        console.error(`[Klaviyo] PATCH fallback failed for ${email}:`, patchErr);
      }
      
      console.warn(`[Klaviyo] Could not create or update profile for ${email}`);
      return false;
    }

    console.log(`[Klaviyo] Profile created for ${email}`);
    return true;
  } catch (err) {
    console.error(`[Klaviyo] Error upserting profile for ${email}:`, err);
    return false;
  }
}
'''
    
    new_lines = lines[:start_idx] + [new_func + '\n'] + lines[end_idx:]
    
    with open('server/_core/klaviyo.ts', 'w') as f:
        f.writelines(new_lines)
    
    print(f"✅ Updated upsertKlaviyoProfile (lines {start_idx}-{end_idx})")
else:
    print("❌ Could not find function to replace")
