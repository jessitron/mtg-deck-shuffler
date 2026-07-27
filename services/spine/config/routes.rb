Rails.application.routes.draw do
  # Health check for the load balancer: 200 if the app boots.
  get "up" => "rails/health#show", as: :rails_health_check

  # The published-language API (contracts/ at the repo root).
  post "tables" => "tables#create"
  get "tables/lookup" => "tables#lookup"
  post "tables/:table_id/seats" => "seats#create"
  post "tables/:table_id/events" => "events#create"

  # The developer can see the log.
  namespace :admin do
    resources :tables, only: [ :index, :show ]
  end

  root to: redirect("/admin/tables")
end
