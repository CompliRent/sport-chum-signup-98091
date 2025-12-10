# Bet Buddies - Final Project Report

**Fall 2025 - Joshua Phelps & Garrett Bennett**

## 📝 Project Summary

Bet Buddies is a social sports betting platform where users create or join leagues with friends, make weekly picks on spreads, moneylines, and over/unders, and compete on leaderboards. Built with React, TypeScript, Supabase, and integrated with live sports odds APIs, the platform provides a competitive, engaging experience without real money gambling.

---

## 🎥 Demo

**Demo Video:** [https://youtu.be/8cn6B-IzLm4](https://youtu.be/8cn6B-IzLm4)

---

## 🏗️ System Architecture

### Initial Design Diagram

![ERD Diagram](https://github.com/user-attachments/assets/51938b98-e18f-444f-b42f-fcb93ec79ea4)

_Entity Relationship Diagram showing Users, Leagues, Cards, and Bets_

### System Design

![System Design](https://github.com/user-attachments/assets/52c95fb8-b29e-4d7c-b644-70d8f99bf49e)

_Architecture showing frontend, Supabase, backend jobs, and SportsGameOdds API integration_

---

## 🤖 How We Used AI to Assist in Building the Project

We used AI tools throughout development in several ways:

- **Lovable** - Used for frontend development, generating React components and UI code
- **Cursor** - Used for backend sync script development, helping write the automated odds fetching and result calculation logic
- **ChatGPT/Claude** - Used for brainstorming ideas, generating SQL to insert fake test data, and debugging complex issues

AI was particularly helpful for generating boilerplate code, writing SQL queries for testing, and troubleshooting errors we encountered during development.

We have not yet integrated our product with AI, but we have considered using it to identify favorable bets. 

---

## 💡 Why This Project is Interesting

Both Joshua and Garrett are passionate sports fans who noticed a gap in the market: sports betting apps focus on gambling, while fantasy sports focus on player stats, but nothing combines the excitement of betting with the social, competitive nature of fantasy leagues.

The project combines several interesting technical challenges: real-time data integration from external APIs, complex relational database design with proper security, scheduled background jobs for data synchronization, and building a full-stack application from scratch.

---

## 🎓 Key Learnings

### 1. Simplicity is Key in Early Projects

We initially overcomplicated our application architecture to use some tools we had used previously in the class. Simplifying our approach saved significant time and made the project more maintainable.

### 2. Abstractions Make Switching Service Providers Much Easier

By creating abstraction layers around our external API calls and database operations, we made it much easier to switch between different service providers when needed. We never actually had to switch APIs, but we could have done so pretty easily if necessary.

### 3. How to Run Cron Jobs Using GitHub Actions

We implemented automated daily sync scripts using GitHub Actions to fetch odds and calculate results. This taught us how to set up scheduled workflows and handle secrets in a CI/CD environment.

### 4. How to Use Postgres Triggers

We used PostgreSQL triggers to automatically recalculate card scores when bet results are updated, to automatically set the creator of a league as the owner, and for a few other tasks. 

```sql
-- Example: Automatic score calculation trigger
CREATE OR REPLACE FUNCTION public.update_card_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cards
  SET total_score = (
    SELECT COALESCE(COUNT(*), 0)
    FROM bets
    WHERE bets.card_id = COALESCE(NEW.card_id, OLD.card_id)
      AND bets.result = true
  )
  WHERE id = COALESCE(NEW.card_id, OLD.card_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

---

**Repository:** [github.com/CompliRent/bet-buddies](https://github.com/CompliRent/bet-buddies)  
**Demo Video:** [youtube.com/watch?v=8cn6B-IzLm4](https://youtu.be/8cn6B-IzLm4)  
**Logs:** [github.com/CompliRent/bet-buddies/blob/main/log.md](https://github.com/CompliRent/bet-buddies/blob/main/log.md)

_Built with ❤️ by Joshua Phelps & Garrett Bennett - Fall 2025_
