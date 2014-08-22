# This file is used by Rack-based servers to start the application.

# path to the angular directory
angular_path = 'frontend/app'
not_found_path = 'public/404.html'

module MyMiddleware

  # Custom404 intercepts every response with a 404 status code
  # and instead displays a default page given by :path
  class Custom404
    def initialize(app, options={})
      @app = app
      if (options[:path])
        path = options[:path]
        file = ::File.expand_path(path)
        @content = ::File.read(file)
        @length = @content.size.to_s
        @mime = Rack::Mime.mime_type(::File.extname(path))
      else
        @content = 'The page you were looking for doesn\'t exist.'
        @length = @content.size.to_s
        @mime = 'text/plain'
      end
    end

    def call(env)
      dup._call(env)
    end

    def _call(env)
      response = @app.call(env)

      if (response[0] == 404) # override 404
        [404, {'Content-Type' => @mime, 'Content-Length' => @length}, [@content]]
      else
        response
      end
    end
  end

  # Delivers static content contained in the directory 'root'.
  # If no such content exists, a default page given by 'not_found'
  # is displayed
  class StaticContent
    def initialize(root, not_found)
      @app = Rack::Builder.new do
        use Custom404, path: not_found
        use Rack::Static, urls: [''], root: root, index: 'index.html'
        # should never happen:
        run lambda { |env| [500, { 'Content-Type' => 'text/html', 'Content-Length' => '21'}, ['Internal Server Error']] }
      end
    end

    def call(env)
      @app.call(env)
    end
  end

end

map '/api' do
  require ::File.expand_path('../config/environment', __FILE__)
  run Rails.application
end

run MyMiddleware::StaticContent.new(angular_path, not_found_path)
