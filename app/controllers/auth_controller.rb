class AuthController < ApplicationController
  require 'auth_token'

  def register
    token = AuthToken.issue_token({})
    render json: { success: true, role: 'user', token: token }
  end

  def authenticate
    token = AuthToken.issue_token({})
    render json: { success: true, role: 'user', token: token }
  end

  def token_status
    token = request.headers['X-AUTH-TOKEN'].split(' ').last
    if AuthToken.valid? token
      render json: { valid: true, role: 'user' }
    else
      render json: { valid: false }
    end
  end

end
