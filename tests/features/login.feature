Feature: Login
  Scenario: User logs in
    Given I am on the login page
    When I submit valid credentials
    Then I see the dashboard
