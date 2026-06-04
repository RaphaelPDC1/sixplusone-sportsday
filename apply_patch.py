with open('server/_core/klaviyo.ts', 'r') as f:
    content = f.read()

# Find the upsertKlaviyoProfile function and replace it
old_upsert = '''export async function upsertKlaviyoProfile(
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

    const result = await makeKlaviyoRequest("POST", "/profiles", payload);
    if (!result) {
      console.warn(`[Klaviyo] Profile upsert failed for ${email}`);
      return false;
    }

    console.log(`[Klaviyo] Profile upserted for ${email}`);
    return true;
  } catch (err) {
    console.error(`[Klaviyo] Error upserting profile for ${email}:`, err);
    return false;
  }
}'''

new_upsert = '''export async function upsertKlaviyoProfile(
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

    let result = await makeKlaviyoRequest("POST", "/profiles", payload);
    
    // If POST failed (409 conflict), try PATCH
    if (!result) {
      console.log(`[Klaviyo] Profile exists, attempting PATCH...`);
      try {
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
          const patchPayload = {
            data: {
              type: "profile",
              id: profileId,
              attributes: { properties },
            },
          };
          
          result = await makeKlaviyoRequest("PATCH", `/profiles/${profileId}`, patchPayload);
          if (result) {
            console.log(`[Klaviyo] Profile updated via PATCH for ${email}`);
            return true;
          }
        }
      } catch (err) {
        console.error(`[Klaviyo] PATCH fallback failed:`, err);
      }
      console.warn(`[Klaviyo] Profile upsert failed for ${email}`);
      return false;
    }

    console.log(`[Klaviyo] Profile upserted for ${email}`);
    return true;
  } catch (err) {
    console.error(`[Klaviyo] Error upserting profile for ${email}:`, err);
    return false;
  }
}'''

content = content.replace(old_upsert, new_upsert)

with open('server/_core/klaviyo.ts', 'w') as f:
    f.write(content)

print("✅ Applied PATCH fallback fix")
