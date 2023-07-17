
use worker::*;
use worker::kv::KvStore;
use std::collections::HashMap;
use rand::{distributions::Alphanumeric, Rng};


fn log_request(req: &Request) {
    console_log!(
        "{} - [{}], located at: {:?}, within: {}",
        Date::now().to_string(),
        req.path(),
        req.cf().coordinates().unwrap_or_default(),
        req.cf().region().unwrap_or_else(|| "unknown region".into())
    );
}

fn create_cors_headers() -> Headers {
    let mut cors_headers = Headers::new();

    cors_headers.set("Access-Control-Allow-Origin", "*").unwrap();
    cors_headers.set("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS").unwrap();
    cors_headers.set("Access-Control-Allow-Headers", "*").unwrap();
    cors_headers.set("Access-Control-Max-Age", "86400").unwrap();
    cors_headers.set("Access-Control-Allow-Credentials", "true").unwrap();

    cors_headers
}


#[event(fetch)]
async fn main(req: Request, env: Env, _: Context) -> Result<Response> {
    log_request(&req);

    if req.method() == Method::Options {
        return Response::empty().map(|resp: Response| {
            resp.with_headers(create_cors_headers())
        });
    }
    
    let r = Router::new();
		r.get("/", |_, _| {
            Response::from_html(include_str!("../www/dist/index.html"))
        })
        .get("/private", |_, _| {
            Response::from_html(include_str!("../www/dist/private.html"))
        })
		.post_async("/api/secret/", |mut req, _ctx| async move {
			let response = match req.form_data().await {
				Ok(value) => {
					if let Some(FormEntry::Field(message)) = value.get("message") {
                        let kv: KvStore = _ctx.kv("PRODUCTION")?;
						let random_url: String = rand::thread_rng()
                            .sample_iter(&Alphanumeric)
                            .take(32)
                            .map(char::from)
                            .collect();
                        
                        let mut ttl: u64 = 3600 * 7 * 24;   // Default TTL
                        if let Some(FormEntry::Field(message_ttl)) = value.get("message_ttl") {
                            if let Ok(ttl_num) = message_ttl.parse::<u64>() {
                                ttl = ttl_num;
                            }
                        }
                        kv.put(&random_url, message)?.expiration_ttl(ttl).execute().await?;
						
						Response::from_json(&serde_json::json!({ 
                            "url": random_url
                        })).map(|resp| {
                            resp.with_headers(create_cors_headers())
                        })
					} else {
						Response::ok("Bad request").map(|resp| {
                            resp.with_headers(create_cors_headers())
                        })
					}
				},
				Err(_) => {
					Response::ok("Bad request").map(|resp| {
                        resp.with_headers(create_cors_headers())
                    })
				}
			};
            
			response.map(|resp| {
                resp.with_headers(create_cors_headers())
            })
		})
        .get_async("/api/secret/", |req: Request, ctx: RouteContext<()>| async move {

            let hash_query: HashMap<_, _> = req.url().unwrap().query_pairs().into_owned().collect();

            let url = hash_query.get("secret_url").unwrap();
            let kv: KvStore = ctx.kv("PRODUCTION")?;
            
            let message = kv.get(url).text().await?;


            let response : Result<Response> = match message {
                Some(_msg) => {                    
                    kv.delete(url).await?;
                    Response::from_json(
                        &serde_json::json!({
                            "text": _msg
                        })
                    )
                }
                None => Response::from_json(
                    &serde_json::json!({
                        "error": "Secret does not exist!"
                    })
                )
            };

            
            
            
            response.map(|resp| {
                resp.with_headers(create_cors_headers())
            })
        })
        .run(req, env).await
} 